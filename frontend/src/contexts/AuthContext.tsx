import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  role?: string;
  youtube_channel_id: string | null;
  youtube_channel_name: string | null;
  youtube_channel_thumbnail: string | null;
  youtube_subscriber_count: number | null;
  youtube_video_count: number | null;
  youtube_last_checked: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Sign in with Google. Requests youtube.readonly scope so we can check the channel. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Reload the profile from the backend (e.g. after updating it). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `id, username, full_name, avatar_url, bio,
         follower_count, following_count, post_count, role,
         youtube_channel_id, youtube_channel_name,
         youtube_channel_thumbnail, youtube_subscriber_count,
         youtube_video_count, youtube_last_checked`
      )
      .eq("id", userId)
      .single();

    if (!error && data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Where Supabase should send the user after the OAuth exchange completes
        redirectTo: window.location.origin,
        // Request YouTube read-only scope so we can call the YouTube Data API with provider_token
        scopes: "https://www.googleapis.com/auth/youtube.readonly",
        queryParams: {
          // Force account-picker every time
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export context for the hook file to consume
export { AuthContext };
