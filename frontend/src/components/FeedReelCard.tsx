import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, Play, Volume2, VolumeX, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DbReel } from "@/hooks/use-reels";
import CommentsSlideUp from "@/components/CommentsSlideUp";
import { useAuth } from "@/contexts/useAuth";
import { useReels } from "@/hooks/use-reels";
import { Trash2 } from "lucide-react";

interface FeedReelCardProps {
  reel: DbReel;
  isActive: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onFollow: (profileId: string) => void;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
};

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ||
  url.includes("video");

const FeedReelCard = ({ reel, isActive, onLike, onSave, onFollow }: FeedReelCardProps) => {
  const { user } = useAuth();
  const { deleteReel } = useReels();
  const [showComments, setShowComments] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(reel.comments_count);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep video.muted in sync with state (React prop alone is unreliable)
  // Play/pause + stop old video when scrolling away
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;

    if (!isActive) {
      video.pause();
      video.currentTime = 0;
      setPaused(false);
      return;
    }

    if (paused) {
      video.pause();
      return;
    }

    video.play().catch(() => {
      // Browser blocked unmuted autoplay — retry muted
      video.muted = true;
      setMuted(true);
      video.play().catch(() => {});
    });
  }, [isActive, paused, muted]);

  const isVideo = isVideoUrl(reel.media_url);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?reel=${reel.id}`;
    const shareData = {
      title: "Check out this reel on Zyfit",
      text: reel.caption ?? "Check out this reel on Zyfit",
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // user dismissed the share sheet — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const handleDoubleTap = () => {
    if (!reel.isLiked && user) onLike(reel.id);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const displayName =
    reel.profiles?.username ??
    reel.profiles?.full_name ??
    "user";

  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarUrl = reel.profiles?.avatar_url;

  return (
    <>
      <div className="relative w-full h-full snap-center flex-shrink-0 bg-background">
        {/* Media area */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onDoubleClick={handleDoubleTap}
          onClick={() => setPaused((p) => !p)}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={reel.media_url}
              className="w-full h-full object-contain bg-black"
              muted={muted}
              loop
              playsInline
            />
          ) : (
            <img
              src={reel.media_url}
              alt={reel.caption ?? "reel"}
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30 pointer-events-none" />

          {/* Pause overlay */}
          <AnimatePresence>
            {paused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
                  <Play className="w-7 h-7 text-foreground ml-1" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Double-tap heart */}
          <AnimatePresence>
            {showHeart && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 15 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-24 h-24 text-primary fill-primary drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right action buttons */}
        <div className="absolute right-3 bottom-32 md:bottom-24 flex flex-col items-center gap-5 z-10">
          {/* Delete Option for Owner */}
          {(user?.id === reel.user_id || user?.id === reel.profiles?.id) && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Are you sure you want to delete this post?")) {
                  try {
                    await deleteReel(reel.id);
                    toast.success("Post deleted successfully");
                    window.location.reload(); // Refresh to reflect changes if the state is unlinked
                  } catch (err: any) {
                    toast.error(err.message || "Could not delete post");
                  }
                }
              }}
              className="flex flex-col items-center gap-1 group"
            >
              <motion.div
                whileTap={{ scale: 1.2 }}
                className="w-11 h-11 rounded-full glass-light flex items-center justify-center transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </motion.div>
            </button>
          )}

          {/* Like */}
          <button
            onClick={() => user && onLike(reel.id)}
            className="flex flex-col items-center gap-1 group"
          >
            <motion.div
              whileTap={{ scale: 1.3 }}
              className={cn(
                "w-11 h-11 rounded-full glass-light flex items-center justify-center transition-colors",
                reel.isLiked && "bg-primary/20"
              )}
            >
              <Heart
                className={cn(
                  "w-6 h-6 transition-all",
                  reel.isLiked ? "text-primary fill-primary" : "text-foreground"
                )}
              />
            </motion.div>
            <span className="text-xs font-medium text-foreground">{formatCount(reel.likes_count)}</span>
          </button>

          {/* Comments */}
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full glass-light flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{formatCount(localCommentCount)}</span>
          </button>

          {/* Save */}
          <button
            onClick={() => user && onSave(reel.id)}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              whileTap={{ scale: 1.2 }}
              className={cn(
                "w-11 h-11 rounded-full glass-light flex items-center justify-center transition-colors",
                reel.isSaved && "bg-accent/20"
              )}
            >
              <Bookmark
                className={cn(
                  "w-6 h-6 transition-all",
                  reel.isSaved ? "text-accent fill-accent" : "text-foreground"
                )}
              />
            </motion.div>
            <span className="text-xs font-medium text-foreground">Save</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <motion.div
              whileTap={{ scale: 1.2 }}
              className="w-11 h-11 rounded-full glass-light flex items-center justify-center"
            >
              <Share2 className="w-6 h-6 text-foreground" />
            </motion.div>
            <span className="text-xs font-medium text-foreground">Share</span>
          </button>

          {/* Mute (video only) */}
          {isVideo && (
            <button onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full glass-light flex items-center justify-center">
                {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
              </div>
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 right-20 bottom-20 md:bottom-8 z-10 flex flex-col gap-3">
          {reel.affiliate_link && (
            <div className="self-start">
              <a 
                href={reel.affiliate_link.startsWith('http') ? reel.affiliate_link : `https://${reel.affiliate_link}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full text-xs font-semibold text-foreground hover:bg-background transition-colors pointer-events-auto shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                Product Link
              </a>
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-2 ring-primary/30 overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                avatarLetter
              )}
            </div>
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">@{displayName}</span>
            {user && user.id !== reel.profiles?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onFollow(reel.profiles!.id); }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                  reel.isFollowing
                    ? "bg-foreground/20 text-foreground"
                    : "border border-foreground/30 text-foreground hover:bg-foreground/10"
                )}
              >
                {reel.isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {reel.caption && (
            <p className="text-sm text-foreground/90 leading-relaxed mb-2 line-clamp-2">
              {reel.caption}
            </p>
          )}

          {reel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {reel.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground/10 text-foreground/80 backdrop-blur-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-16 md:bottom-2 left-0 right-0 px-4 z-10">
          <div className="h-0.5 bg-foreground/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: "0%" }}
              animate={isActive && !paused ? { width: "100%" } : {}}
              transition={{ duration: 15, ease: "linear" }}
            />
          </div>
        </div>
      </div>

      <CommentsSlideUp
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        commentCount={localCommentCount}
        reelId={reel.id}
        onCommentAdded={() => setLocalCommentCount((c) => c + 1)}
      />
    </>
  );
};

export default FeedReelCard;
