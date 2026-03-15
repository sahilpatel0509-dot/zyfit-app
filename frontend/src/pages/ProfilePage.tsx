import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, Grid3X3, Bookmark, Heart, Play, Youtube, LogIn, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { fetchMyYouTubeChannel, saveChannelToProfile } from "@/lib/youtube";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ReelModal } from "@/components/ReelModal";

const tabs = [
  { icon: Grid3X3, label: "Posts" },
  { icon: Bookmark, label: "Saved" },
  { icon: Heart, label: "Liked" },
];

interface GridReel {
  id: string;
  media_url: string;
  caption: string | null;
  likes_count: number;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes("video");

const formatSubscribers = (n: number | null): string => {
  if (n === null) return "Hidden";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
};

const ProfilePage = () => {
  const { user, profile, loading, signInWithGoogle, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const publicProfileId = searchParams.get("id");

  const isOwnProfile = !publicProfileId || publicProfileId === user?.id;
  const profileIdToFetch = isOwnProfile ? user?.id : publicProfileId;

  const [activeTab, setActiveTab] = useState("Posts");
  const [checkingYT, setCheckingYT] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [gridReels, setGridReels] = useState<GridReel[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [liveStats, setLiveStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnProfile && publicProfileId) {
      setIsFetchingProfile(true);
      const fetchPublicProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", publicProfileId)
            .single();
          if (!error && data) setPublicProfile(data);
        } finally {
          setIsFetchingProfile(false);
        }
      };
      fetchPublicProfile();
    } else {
      setPublicProfile(null);
    }
  }, [isOwnProfile, publicProfileId]);

  const fetchStats = useCallback(async (userId: string) => {
    const [postsRes, followersRes, followingRes] = await Promise.all([
      supabase.from("reels").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_published", true),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    
    let followingStatus = false;
    if (user && userId !== user.id) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).single();
      followingStatus = !!data;
    }

    setLiveStats({
      posts: postsRes.count ?? 0,
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });
    setIsFollowing(followingStatus);
  }, [user]);

  useEffect(() => {
    if (user && isOwnProfile) fetchStats(user.id);
  }, [user, isOwnProfile, fetchStats]);

  const fetchGrid = useCallback(async (tab: string, userId: string) => {
    setGridLoading(true);
    try {
      let reelIds: string[] = [];

      if (tab === "Posts") {
        const { data } = await supabase
          .from("reels")
          .select("id")
          .eq("user_id", userId)
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        reelIds = (data ?? []).map((r: { id: string }) => r.id);
      } else if (tab === "Saved") {
        const { data } = await supabase
          .from("saves")
          .select("reel_id")
          .eq("user_id", userId);
        reelIds = (data ?? []).map((s: { reel_id: string }) => s.reel_id);
      } else {
        const { data } = await supabase
          .from("likes")
          .select("reel_id")
          .eq("user_id", userId);
        reelIds = (data ?? []).map((l: { reel_id: string }) => l.reel_id);
      }

      if (reelIds.length === 0) { setGridReels([]); return; }

      // Fetch reel info + all likes for accurate count
      const [reelsRes, likesRes] = await Promise.all([
        tab === "Posts"
          ? supabase.from("reels").select("id, media_url, caption").in("id", reelIds).eq("is_published", true).order("created_at", { ascending: false })
          : supabase.from("reels").select("id, media_url, caption").in("id", reelIds).eq("is_published", true),
        supabase.from("likes").select("reel_id").in("reel_id", reelIds),
      ]);

      const likeCountMap: Record<string, number> = {};
      for (const l of (likesRes.data ?? []) as { reel_id: string }[]) {
        likeCountMap[l.reel_id] = (likeCountMap[l.reel_id] ?? 0) + 1;
      }

      setGridReels(
        (reelsRes.data ?? []).map((r: { id: string; media_url: string; caption: string | null }) => ({
          ...r,
          likes_count: likeCountMap[r.id] ?? 0,
        }))
      );
    } finally {
      setGridLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileIdToFetch) {
      fetchGrid(activeTab, profileIdToFetch);
      fetchStats(profileIdToFetch);
    }
  }, [profileIdToFetch, activeTab, fetchGrid, fetchStats]);

  const handleCheckYouTube = async () => {
    setCheckingYT(true);
    try {
      const channel = await fetchMyYouTubeChannel();
      if (channel && user) {
        await saveChannelToProfile(user.id, channel);
        await refreshProfile();
        toast({
          title: "YouTube channel linked!",
          description: `${channel.name} — ${formatSubscribers(channel.subscriberCount)} subscribers`,
        });
      } else {
        toast({
          title: "No YouTube channel found",
          description: "Your Google account has no associated YouTube channel.",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Could not check YouTube",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCheckingYT(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profileIdToFetch || isOwnProfile) return;
    
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setLiveStats(s => ({
      ...s,
      followers: wasFollowing ? Math.max(0, s.followers - 1) : s.followers + 1
    }));

    if (wasFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileIdToFetch);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profileIdToFetch });
    }
  };

  /* ── Not logged in ─────────────────────────────────────────────────────── */
  if (!loading && !user && !publicProfileId) {
    return (
      <div className="min-h-screen pt-14 pb-20 md:pb-4 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-2">
          <LogIn className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Sign in to view your profile</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Use your Google account. We'll also detect your YouTube channel and subscriber count.
        </p>
        <button
          onClick={signInWithGoogle}
          className="mt-2 h-11 px-8 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
          Continue with Google
        </button>
      </div>
    );
  }

  if (isFetchingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayProfile = isOwnProfile ? profile : publicProfile;
  const displayName = displayProfile?.full_name ?? displayProfile?.username ?? (isOwnProfile ? user?.email : "User");
  const initial = displayName?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold ring-4 ring-primary/20 shrink-0 overflow-hidden">
            {displayProfile?.avatar_url ? (
              <img
                src={displayProfile.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-display font-bold text-foreground">{displayName}</h1>
              {displayProfile?.username && (
                <span className="text-sm text-muted-foreground">@{displayProfile.username}</span>
              )}
              {isOwnProfile && (
                <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                  <Settings className="w-4 h-4 text-foreground" />
                </button>
              )}
            </div>
            {displayProfile?.bio && (
              <p className="text-sm text-muted-foreground mb-3">{displayProfile.bio}</p>
            )}
            <div className="flex gap-5">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{liveStats.posts}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{liveStats.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{liveStats.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </div>

        {/* YouTube Channel Card */}
        {displayProfile?.youtube_channel_id ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-card border border-border/50"
          >
            {displayProfile.youtube_channel_thumbnail ? (
              <img
                src={displayProfile.youtube_channel_thumbnail}
                alt={displayProfile.youtube_channel_name ?? ""}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayProfile.youtube_channel_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSubscribers(displayProfile.youtube_subscriber_count)} subscribers
              </p>
            </div>
            {isOwnProfile && (
              <button
                onClick={handleCheckYouTube}
                disabled={checkingYT}
                className="text-xs text-primary hover:underline disabled:opacity-50 shrink-0"
              >
                {checkingYT ? "Refreshing…" : "Refresh"}
              </button>
            )}
          </motion.div>
        ) : (isOwnProfile && (
          <div className="mb-6">
            <button
              onClick={handleCheckYouTube}
              disabled={checkingYT}
              className="w-full h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Youtube className="w-4 h-4 text-red-500" />
              {checkingYT ? "Checking YouTube…" : "Link YouTube Channel"}
            </button>
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {isOwnProfile && (
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="flex-1 h-10 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Edit Profile
            </button>
          )}
          {!isOwnProfile && user && (
            <button
              onClick={handleFollowToggle}
              className={cn(
                "flex-1 h-10 rounded-xl text-sm font-semibold transition-opacity",
                isFollowing
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-gradient-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <button
            onClick={() => {
              const url = `${window.location.origin}/profile?id=${profileIdToFetch}`;
              if (navigator.share) {
                navigator.share({
                  title: 'My Profile',
                  url: url
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(url);
                toast({
                  title: "Link copied!",
                  description: "Profile link copied to clipboard.",
                });
              }
            }}
            className="flex-1 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
          >
            Share Profile
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50 mb-4">
          {(isOwnProfile ? tabs : [tabs[0]]).map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all",
                activeTab === label
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        {gridLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : gridReels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {activeTab === "Posts" && <Grid3X3 className="w-10 h-10 text-muted-foreground mb-3" />}
            {activeTab === "Saved" && <Bookmark className="w-10 h-10 text-muted-foreground mb-3" />}
            {activeTab === "Liked" && <Heart className="w-10 h-10 text-muted-foreground mb-3" />}
            <p className="text-sm text-muted-foreground">No {activeTab.toLowerCase()} yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {gridReels.map((reel, i) => (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedReelId(reel.id)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group bg-card"
              >
                {isVideoUrl(reel.media_url) ? (
                  <video
                    src={reel.media_url}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={reel.media_url}
                    alt={reel.caption ?? ""}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-8 h-8 text-foreground" />
                </div>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs text-foreground font-medium drop-shadow">
                  <Heart className="w-3 h-3" />
                  {reel.likes_count}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
      <ReelModal reelId={selectedReelId} isOpen={!!selectedReelId} onClose={() => setSelectedReelId(null)} />
    </div>
  );
};

export default ProfilePage;
