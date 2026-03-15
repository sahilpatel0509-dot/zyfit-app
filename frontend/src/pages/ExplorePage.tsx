import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Heart, Bookmark, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReels } from "@/hooks/use-reels";
import { useAuth } from "@/contexts/useAuth";
import { useSearchParams } from "react-router-dom";
import { ReelModal } from "@/components/ReelModal";

const CATEGORIES = ["All", "Streetwear", "Casual", "Formal", "Trending", "Boho", "Summer", "Denim", "Night"];

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes("video");

const ExplorePage = () => {
  const { user } = useAuth();
  const { reels, loading, toggleSave } = useReels();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim()) {
      setSearchParams({ q: value.trim() });
    } else {
      setSearchParams({});
    }
  };

  const filtered = useMemo(() => {
    let result = reels;
    if (activeCategory !== "All") {
      result = result.filter((r) =>
        r.tags.some((t) => t.toLowerCase().includes(activeCategory.toLowerCase()))
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.caption?.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          (r.profiles?.username ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [reels, activeCategory, search]);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-4">
      <div className="px-4 md:px-6 py-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Explore</h1>
        <p className="text-sm text-muted-foreground mb-4">Discover trending fashion content</p>

        {/* Search */}
        <div className="relative mb-4 sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search reels, tags, creators…"
            className="w-full h-10 pl-9 pr-20 rounded-full bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => setSearchParams(search.trim() ? { q: search.trim() } : {})}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-foreground font-medium mb-1">No reels found</p>
            <p className="text-sm text-muted-foreground">Try a different category or search term</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((reel, i) => (
                <motion.div
                  key={reel.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedReelId(reel.id)}
                  className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-[3/4] bg-card"
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

                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
                      <Play className="w-5 h-5 text-foreground ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-xs font-semibold text-foreground mb-1">
                      @{reel.profiles?.username ?? "user"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-foreground/80">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {reel.likes_count}</span>
                    </div>
                  </div>

                  {/* Tag badge */}
                  {reel.tags[0] && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/10 text-foreground backdrop-blur-sm">
                        #{reel.tags[0]}
                      </span>
                    </div>
                  )}

                  {/* Save button */}
                  {user && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(reel.id); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full glass-light flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Bookmark
                        className={cn(
                          "w-4 h-4 transition-all",
                          reel.isSaved ? "text-accent fill-accent" : "text-foreground"
                        )}
                      />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
      <ReelModal reelId={selectedReelId} isOpen={!!selectedReelId} onClose={() => setSelectedReelId(null)} />
    </div>
  );
};

export default ExplorePage;
