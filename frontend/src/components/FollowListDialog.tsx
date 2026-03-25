import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "followers" | "following" | null;
  userId: string | null;
}

export function FollowListDialog({ open, onOpenChange, type, userId }: FollowListDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && type && userId) {
      fetchProfiles();
    } else {
      setProfiles([]);
    }
  }, [open, type, userId]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      if (type === "followers") {
        const { data: followData, error: followError } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId);

        if (followError) throw followError;

        const ids = followData?.map(f => f.follower_id) || [];
        if (ids.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", ids);

          if (profileError) throw profileError;
          setProfiles(profileData || []);
        } else {
          setProfiles([]);
        }
      } else if (type === "following") {
        const { data: followData, error: followError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (followError) throw followError;

        const ids = followData?.map(f => f.following_id) || [];
        if (ids.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", ids);

          if (profileError) throw profileError;
          setProfiles(profileData || []);
        } else {
          setProfiles([]);
        }
      }
    } catch (error) {
      console.error("Error fetching follow list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (id: string) => {
    onOpenChange(false);
    // Add auto-close and navigation 
    // Small timeout to allow dialog close animation before heavy navigation
    setTimeout(() => {
      navigate(`/profile?id=${id}`);
    }, 150);
  };

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No {type} found.
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileClick(profile.id)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
               >
                <div className="w-11 h-11 rounded-full bg-secondary shrink-0 overflow-hidden flex items-center justify-center font-bold text-lg text-muted-foreground border">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username || "User"} className="w-full h-full object-cover" />
                  ) : (
                    (profile.full_name || profile.username || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{profile.full_name || profile.username || "User"}</p>
                  {profile.username && (
                    <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
