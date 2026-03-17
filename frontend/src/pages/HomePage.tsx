import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useReels } from "@/hooks/use-reels";
import FeedReelCard from "@/components/FeedReelCard";

const HomePage = () => {
  const { reels, loading, error, toggleLike, toggleSave, toggleFollow } = useReels();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [reels]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-center px-6">
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-foreground font-semibold">No reels yet</p>
        <p className="text-muted-foreground text-sm">Be the first to upload a fashion reel!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
    >
      {reels.map((reel, index) => (
        <div key={reel.id} data-index={index} className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] snap-start">
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
  );
};

export default HomePage;
