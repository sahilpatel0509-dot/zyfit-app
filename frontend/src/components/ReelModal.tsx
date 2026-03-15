import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import FeedReelCard from "./FeedReelCard";
import { useReels } from "@/hooks/use-reels";
import { Loader2, X } from "lucide-react";

interface ReelModalProps {
  reelId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReelModal({ reelId, isOpen, onClose }: ReelModalProps) {
  const { reels, loading, toggleLike, toggleSave, toggleFollow } = useReels();
  
  const reel = reels.find((r) => r.id === reelId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 border-none bg-black max-w-[400px] h-[85vh] sm:h-[80vh] overflow-hidden rounded-2xl flex items-center justify-center">
        <DialogTitle className="sr-only">View Reel</DialogTitle>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {reel ? (
          <div className="w-full h-full relative">
            <FeedReelCard
              reel={reel}
              isActive={true}
              onLike={toggleLike}
              onSave={toggleSave}
              onFollow={toggleFollow}
            />
          </div>
        ) : loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        ) : (
          <p className="text-white text-sm">Reel not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
