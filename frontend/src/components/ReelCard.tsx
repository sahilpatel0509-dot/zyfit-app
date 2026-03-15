import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReelData } from "@/data/reels";
import CommentsSlideUp from "@/components/CommentsSlideUp";

interface ReelCardProps {
  reel: ReelData;
  isActive: boolean;
}

const formatCount = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
};

const ReelCard = ({ reel, isActive }: ReelCardProps) => {
  const [liked, setLiked] = useState(reel.isLiked);
  const [saved, setSaved] = useState(reel.isSaved);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [showComments, setShowComments] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <>
      <div className="relative w-full h-full snap-center flex-shrink-0 bg-background">
        {/* Video / Image Area */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onDoubleClick={handleDoubleTap}
          onClick={() => setPaused(!paused)}
        >
          <img
            src={reel.image}
            alt={reel.caption}
            className="w-full h-full object-cover"
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

          {/* Pause indicator */}
          <AnimatePresence>
            {paused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
                  <Play className="w-7 h-7 text-foreground ml-1" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Double tap heart */}
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

        {/* Right side action buttons */}
        <div className="absolute right-3 bottom-32 md:bottom-24 flex flex-col items-center gap-5 z-10">
          {/* Like */}
          <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
            <motion.div
              whileTap={{ scale: 1.3 }}
              className={cn(
                "w-11 h-11 rounded-full glass-light flex items-center justify-center transition-colors",
                liked && "bg-primary/20"
              )}
            >
              <Heart className={cn("w-6 h-6 transition-all", liked ? "text-primary fill-primary" : "text-foreground")} />
            </motion.div>
            <span className="text-xs font-medium text-foreground">{formatCount(likeCount)}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full glass-light flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{formatCount(reel.comments)}</span>
          </button>

          {/* Save */}
          <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-1">
            <motion.div
              whileTap={{ scale: 1.2 }}
              className={cn(
                "w-11 h-11 rounded-full glass-light flex items-center justify-center transition-colors",
                saved && "bg-accent/20"
              )}
            >
              <Bookmark className={cn("w-6 h-6 transition-all", saved ? "text-accent fill-accent" : "text-foreground")} />
            </motion.div>
            <span className="text-xs font-medium text-foreground">Save</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full glass-light flex items-center justify-center">
              <Share2 className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{formatCount(reel.shares)}</span>
          </button>

          {/* Mute */}
          <button onClick={() => setMuted(!muted)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full glass-light flex items-center justify-center">
              {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
            </div>
          </button>
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 right-20 bottom-20 md:bottom-8 z-10">
          {/* User */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-2 ring-primary/30">
              {reel.avatar}
            </div>
            <span className="text-sm font-semibold text-foreground">@{reel.username}</span>
            <button className="px-3 py-1 rounded-full border border-foreground/30 text-xs font-medium text-foreground hover:bg-foreground/10 transition-colors">
              Follow
            </button>
          </div>

          {/* Caption */}
          <p className="text-sm text-foreground/90 leading-relaxed mb-2 line-clamp-2">
            {reel.caption}
          </p>

          {/* Tags */}
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
        commentCount={reel.comments}
      />
    </>
  );
};

export default ReelCard;
