import { motion } from "framer-motion";
import { Bookmark, Play, Heart, Loader2, LogIn } from "lucide-react";
import { useReels } from "@/hooks/use-reels";
import { useAuth } from "@/contexts/useAuth";
import { cn } from "@/lib/utils";
import { ReelModal } from "@/components/ReelModal";
import { useState } from "react";
const isVideoUrl = (url: string) => /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes("video");

const SavedPage = () => {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { reels, loading, toggleSave } = useReels();
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const savedReels = reels.filter((r) => r.isSaved);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen md:pt-14 pb-16 md:pb-4 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Bookmark className="w-12 h-12 text-muted-foreground mb-2" />
        <h2 className="text-xl font-display font-bold text-foreground">Sign in to see saved reels</h2>
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

  return (
    <div className="min-h-screen md:pt-14 pb-16 md:pb-4">
      <div className="px-4 md:px-6 md:py-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Bookmark className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">Saved</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Your collection of saved fashion reels</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : savedReels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-1">No saved reels yet</p>
            <p className="text-sm text-muted-foreground">Tap the bookmark icon on reels to save them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {savedReels.map((reel, i) => (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedReelId(reel.id)}
                className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-[3/4] bg-card"
              >
                {isVideoUrl(reel.media_url) ? (
                  <video
                    src={reel.media_url}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    muted playsInline preload="metadata"
                  />
                ) : (
                  <img
                    src={reel.media_url}
                    alt={reel.caption ?? ""}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-semibold text-foreground">@{reel.profiles?.username ?? "user"}</p>
                  <div className="flex items-center gap-2 text-xs text-foreground/80 mt-0.5">
                    <Heart className="w-3 h-3" /> {reel.likes_count}
                  </div>
                </div>
                {/* Unsave button */}
                <button
                  onClick={() => toggleSave(reel.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full glass-light flex items-center justify-center"
                >
                  <Bookmark className={cn("w-4 h-4", reel.isSaved ? "text-accent fill-accent" : "text-foreground")} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <ReelModal reelId={selectedReelId} isOpen={!!selectedReelId} onClose={() => setSelectedReelId(null)} />
    </div>
  );
};

export default SavedPage;
