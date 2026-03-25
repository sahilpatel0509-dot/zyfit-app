import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useReels } from "@/hooks/use-reels";
import FeedReelCard from "@/components/FeedReelCard";

let cachedShuffledIds: string[] = [];

const HomePage = () => {
  const { reels, loading, error, toggleLike, toggleSave, toggleFollow } = useReels();
  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffledIds, setShuffledIds] = useState<string[]>(cachedShuffledIds);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reels.length > 0 && cachedShuffledIds.length === 0) {
      // First time loading reels in this browser session
      const ids = reels.map(r => r.id);
      ids.sort(() => Math.random() - 0.5);
      cachedShuffledIds = ids;
      setShuffledIds(ids);
    } else if (reels.length > 0) {
      // Keep existing randomized order but add new reels to the end / remove deleted ones
      const existingValidIds = cachedShuffledIds.filter(id => reels.some(r => r.id === id));
      const newReelIds = reels.map(r => r.id).filter(id => !cachedShuffledIds.includes(id));
      
      const newOrder = [...existingValidIds, ...newReelIds];
      cachedShuffledIds = newOrder;
      setShuffledIds(newOrder);
    }
  }, [reels.length]);

  const displayReels = useMemo(() => {
    if (shuffledIds.length === 0) return reels;
    return shuffledIds
      .map(id => reels.find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);
  }, [shuffledIds, reels]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const items = container.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [displayReels]);

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-center px-6">
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  // 📭 Empty state
  if (displayReels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-foreground font-semibold">No reels yet</p>
        <p className="text-muted-foreground text-sm">
          Be the first to upload a fashion reel!
        </p>

        {/* ✅ Footer for empty state */}
        <div className="mt-4 text-xs">
          <a href="/privacy" className="underline mr-2">
            Privacy Policy
          </a>
          |
          <a href="/terms" className="underline ml-2">
            Terms
          </a>
        </div>
      </div>
    );
  }

  // 🎬 Main UI
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {displayReels.map((reel, index) => (
          <div
            key={reel.id}
            data-index={index}
            className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] snap-start"
          >
            <FeedReelCard
              reel={reel}
              isActive={index === activeIndex}
              onLike={toggleLike}
              onSave={toggleSave}
              onFollow={toggleFollow}
            />
          </div>
        ))}
      </div>

      {/* ✅ FIXED FOOTER (VERY IMPORTANT FOR GOOGLE) */}
      <div className="fixed bottom-2 left-2 text-left text-xs text-white z-50">
        <a href="/privacy" className="underline mr-2">
          Privacy Policy
        </a>
        |
        <a href="/terms" className="underline ml-2">
          Terms of Service
        </a>
      </div>
    </div>
  );
};

export default HomePage;