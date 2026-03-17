import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/useAuth";

export interface DbReel {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  affiliate_link: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

export function useReels() {
  const { user } = useAuth();
  const [reels, setReels] = useState<DbReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("reels")
        .select(`
          id, user_id, media_url, caption, affiliate_link, tags,
          created_at,
          profiles:user_id ( id, username, full_name, avatar_url )
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const likeCountMap: Record<string, number> = {};
      const commentCountMap: Record<string, number> = {};
      const likedIds = new Set<string>();
      let savedIds = new Set<string>();
      let followingIds = new Set<string>();

      if (data && data.length > 0) {
        const ids = data.map((r: { id: string }) => r.id);

        // Fetch all likes, saves for current user, and follows in parallel
        const [likesRes, savesRes, followsRes, commentsRes] = await Promise.all([
          supabase.from("likes").select("reel_id, user_id").in("reel_id", ids),
          user
            ? Promise.resolve(supabase.from("saves").select("reel_id").eq("user_id", user.id).in("reel_id", ids))
                .catch(() => ({ data: [] as { reel_id: string }[] }))
            : Promise.resolve({ data: [] as { reel_id: string }[] }),
          user
            ? Promise.resolve(supabase.from("follows").select("following_id").eq("follower_id", user.id))
                .catch(() => ({ data: [] as { following_id: string }[] }))
            : Promise.resolve({ data: [] as { following_id: string }[] }),
          supabase.from("comments").select("reel_id").in("reel_id", ids),
        ]);

        // Count total likes per reel AND determine which the user liked
        for (const like of (likesRes.data ?? []) as { reel_id: string; user_id: string }[]) {
          likeCountMap[like.reel_id] = (likeCountMap[like.reel_id] ?? 0) + 1;
          if (user && like.user_id === user.id) likedIds.add(like.reel_id);
        }

        savedIds = new Set((savesRes.data ?? []).map((s: { reel_id: string }) => s.reel_id));
        followingIds = new Set((followsRes.data ?? []).map((f: { following_id: string }) => f.following_id));

        for (const c of (commentsRes.data ?? []) as { reel_id: string }[]) {
          commentCountMap[c.reel_id] = (commentCountMap[c.reel_id] ?? 0) + 1;
        }
      }

      type RawReel = Omit<DbReel, "isLiked" | "isSaved" | "isFollowing" | "likes_count" | "comments_count" | "profiles"> & {
        profiles: DbReel["profiles"] | DbReel["profiles"][];
      };

      setReels(
        (data ?? []).map((r: RawReel) => ({
          ...r,
          tags: Array.isArray(r.tags) ? r.tags : [],
          likes_count: likeCountMap[r.id] ?? 0,
          comments_count: commentCountMap[r.id] ?? 0,
          profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles,
          isLiked: likedIds.has(r.id),
          isSaved: savedIds.has(r.id),
          isFollowing: r.profiles
            ? followingIds.has(Array.isArray(r.profiles) ? (r.profiles[0]?.id ?? "") : (r.profiles?.id ?? ""))
            : false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reels");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Clear stale per-user state immediately when user changes
  useEffect(() => {
    setReels((prev) =>
      prev.map((r) => ({ ...r, isLiked: false, isSaved: false, isFollowing: false }))
    );
  }, [user?.id]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const toggleLike = useCallback(
    async (reelId: string) => {
      if (!user) return;
      const reel = reels.find((r) => r.id === reelId);
      if (!reel) return;

      const wasLiked = reel.isLiked;
      const prevCount = reel.likes_count;

      // Optimistic update
      setReels((prev) =>
        prev.map((r) =>
          r.id === reelId
            ? { ...r, isLiked: !wasLiked, likes_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1 }
            : r
        )
      );

      if (wasLiked) {
        const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("reel_id", reelId);
        if (error) {
          setReels((prev) =>
            prev.map((r) => (r.id === reelId ? { ...r, isLiked: wasLiked, likes_count: prevCount } : r))
          );
        }
      } else {
        const { error } = await supabase.from("likes").insert({ user_id: user.id, reel_id: reelId });
        if (error) {
          setReels((prev) =>
            prev.map((r) => (r.id === reelId ? { ...r, isLiked: wasLiked, likes_count: prevCount } : r))
          );
        }
      }
    },
    [user, reels]
  );

  const toggleSave = useCallback(
    async (reelId: string) => {
      if (!user) return;
      const reel = reels.find((r) => r.id === reelId);
      if (!reel) return;

      const wasSaved = reel.isSaved;

      // Optimistic update
      setReels((prev) =>
        prev.map((r) => (r.id === reelId ? { ...r, isSaved: !wasSaved } : r))
      );

      if (wasSaved) {
        const { error } = await supabase.from("saves").delete().eq("user_id", user.id).eq("reel_id", reelId);
        if (error) {
          setReels((prev) =>
            prev.map((r) => (r.id === reelId ? { ...r, isSaved: wasSaved } : r))
          );
        }
      } else {
        const { error } = await supabase.from("saves").insert({ user_id: user.id, reel_id: reelId });
        if (error) {
          setReels((prev) =>
            prev.map((r) => (r.id === reelId ? { ...r, isSaved: wasSaved } : r))
          );
        }
      }
    },
    [user, reels]
  );

  const toggleFollow = useCallback(
    async (profileId: string) => {
      if (!user || user.id === profileId) return;
      const isFollowing = reels.find((r) => r.profiles?.id === profileId)?.isFollowing ?? false;

      // Optimistic update across all reels by this user
      setReels((prev) =>
        prev.map((r) =>
          r.profiles?.id === profileId ? { ...r, isFollowing: !isFollowing } : r
        )
      );

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);
        if (error) setReels((prev) => prev.map((r) => (r.profiles?.id === profileId ? { ...r, isFollowing } : r)));
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: profileId });
        if (error) setReels((prev) => prev.map((r) => (r.profiles?.id === profileId ? { ...r, isFollowing } : r)));
      }
    },
    [user, reels]
  );

  const deleteReel = useCallback(
    async (reelId: string) => {
      try {
        const { error } = await supabase.from("reels").delete().eq("id", reelId);
        if (error) throw error;
        
        // Optimistically remove it from state
        setReels((prev) => prev.filter((r) => r.id !== reelId));
        return true;
      } catch (err: any) {
        throw new Error(err.message || "Failed to delete reel");
      }
    },
    []
  );

  return { reels, loading, error, fetchReels, toggleLike, toggleSave, toggleFollow, deleteReel };
}

