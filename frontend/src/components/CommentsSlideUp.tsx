import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/useAuth";

interface DbComment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
  localLikes: number;
  localLiked: boolean;
}

interface CommentsSlideUpProps {
  isOpen: boolean;
  onClose: () => void;
  commentCount: number;
  reelId?: string;
  onCommentAdded?: () => void;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const CommentsSlideUp = ({ isOpen, onClose, commentCount, reelId, onCommentAdded }: CommentsSlideUpProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<DbComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!reelId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("comments")
      .select("id, user_id, text, created_at")
      .eq("reel_id", reelId)
      .order("created_at", { ascending: false });

    if (!rows || rows.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))];
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    const profileMap: Record<string, DbComment["profiles"]> = {};
    for (const p of (profileRows ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]) {
      profileMap[p.id] = p;
    }

    setComments(
      rows.map((r: { id: string; user_id: string; text: string; created_at: string }) => ({
        ...r,
        profiles: profileMap[r.user_id] ?? null,
        localLikes: 0,
        localLiked: false,
      }))
    );
    setLoading(false);
  }, [reelId]);

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, fetchComments]);

  const toggleCommentLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, localLiked: !c.localLiked, localLikes: c.localLiked ? c.localLikes - 1 : c.localLikes + 1 }
          : c
      )
    );
  };

  const addComment = async () => {
    if (!newComment.trim() || !user || !reelId || submitting) return;
    setSubmitting(true);
    const text = newComment.trim();
    setNewComment("");
    const { data, error } = await supabase
      .from("comments")
      .insert({ reel_id: reelId, user_id: user.id, text })
      .select("id, user_id, text, created_at")
      .single();
    if (!error && data) {
      const inserted = data as { id: string; user_id: string; text: string; created_at: string };
      setComments((prev) => [
        {
          ...inserted,
          profiles: {
            username: profile?.username ?? null,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          },
          localLikes: 0,
          localLiked: false,
        },
        ...prev,
      ]);
      onCommentAdded?.();
    }
    setSubmitting(false);
  };

  const myAvatarUrl = profile?.avatar_url;
  const myInitial = (profile?.username ?? profile?.full_name ?? user?.email ?? "Y").charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] max-h-[70vh] rounded-t-3xl bg-card border-t border-border/50 flex flex-col"
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border/50">
              <h3 className="font-display font-semibold text-foreground">
                Comments <span className="text-muted-foreground font-body text-sm font-normal">({commentCount})</span>
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground text-sm">No comments yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Be the first to comment!</p>
                </div>
              ) : (
                comments.map((comment, i) => {
                  const name = comment.profiles?.username ?? comment.profiles?.full_name ?? "user";
                  const initial = name.charAt(0).toUpperCase();
                  const avatarUrl = comment.profiles?.avatar_url;
                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground">{name}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-secondary-foreground leading-relaxed">{comment.text}</p>
                        <button
                          onClick={() => toggleCommentLike(comment.id)}
                          className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Heart className={cn("w-3 h-3", comment.localLiked && "fill-primary text-primary")} />
                          {comment.localLikes > 0 && comment.localLikes}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0 overflow-hidden">
                {myAvatarUrl ? (
                  <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : myInitial}
              </div>
              {user ? (
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !submitting && addComment()}
                    placeholder="Add a comment..."
                    className="w-full h-10 pl-4 pr-12 rounded-full bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || submitting}
                    className="absolute right-1 top-1 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sign in to leave a comment</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentsSlideUp;
