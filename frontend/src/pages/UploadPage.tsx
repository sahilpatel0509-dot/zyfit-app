import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Film, Tag, Type, CheckCircle2, Loader2, LogIn, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp"];

type UploadStatus = "idle" | "uploading" | "done" | "error";

const UploadPage = () => {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);

  const handleFile = (f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      toast({ title: "Unsupported file type", description: "Use MP4, WebM, MOV, JPG, PNG or WebP.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum size is 200 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setIsVideo(f.type.startsWith("video/"));
    setPreview(URL.createObjectURL(f));
    setStatus("idle");
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setIsVideo(false);
    setStatus("idle");
    setProgress(0);
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };
  const removeTag = (t: string) => setTags(tags.filter(tag => tag !== t));

  const handleSubmit = async () => {
    if (!file || !user) return;
    setStatus("uploading");
    setProgress(10);

    try {
      // 1. Upload file to Supabase Storage
      const ext = file.name.split(".").pop();
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("reels")
        .upload(storagePath, file, { upsert: false });

      if (storageError) throw storageError;
      setProgress(60);

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("reels")
        .getPublicUrl(storagePath);

      setProgress(75);

      // 3. Insert reel record
      const { error: dbError } = await supabase.from("reels").insert({
        user_id: user.id,
        media_url: publicUrl,
        caption: caption.trim() || null,
        affiliate_link: affiliateLink.trim() || null,
        tags,
        is_published: true,
      });

      if (dbError) throw dbError;
      setProgress(100);
      setStatus("done");

      toast({ title: "Reel uploaded!", description: "Your reel is now live." });

      setTimeout(() => navigate("/profile"), 1500);
    } catch (err: unknown) {
      setStatus("error");
      setProgress(0);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen pt-14 pb-20 md:pb-4 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-2">
          <LogIn className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Sign in to upload</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Share your fashion moments with the Zyfit community.</p>
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

  // Not linked YouTube or doesn't meet criteria
  const { profile } = useAuth();
  const hasLinkedYouTube = !!profile?.youtube_channel_id;
  const subscriberCount = profile?.youtube_subscriber_count ?? 0;
  const videoCount = profile?.youtube_video_count ?? 0;

  if (!hasLinkedYouTube || subscriberCount < 10 || videoCount < 10) {
    return (
      <div className="min-h-screen pt-14 pb-20 md:pb-4 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center mb-2">
          <Upload className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Uploads Locked</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {!hasLinkedYouTube
            ? "You must link your YouTube channel to upload reels on Zyfit."
            : `To maintain quality, you need at least 10 subscribers and 10 videos on YouTube to upload. You currently have ${subscriberCount} subscribers and ${videoCount} videos.`}
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="mt-2 h-11 px-8 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Upload Reel</h1>
        <p className="text-sm text-muted-foreground mb-8">Share your fashion moment with the world</p>

        <div className="grid gap-6">
          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
              } ${preview ? "p-0 overflow-hidden" : "p-12"}`}
          >
            {preview ? (
              <div className="relative aspect-[9/16] max-h-[420px]">
                {isVideo ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={clearFile}
                  disabled={status === "uploading"}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full glass text-xs text-foreground font-medium">
                  <Film className="w-3 h-3 inline mr-1" />
                  {file?.name}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4"
                >
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </motion.div>
                <p className="text-foreground font-medium mb-1">Drag & drop your video or image</p>
                <p className="text-sm text-muted-foreground mb-1">MP4, WebM, MOV, JPG, PNG, WebP</p>
                <p className="text-xs text-muted-foreground mb-4">Max 200 MB</p>
                <label className="px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
                  Choose File
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's the vibe? Tell your audience..."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl bg-secondary border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{caption.length}/500</p>
          </div>

          {/* Affiliate Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
              Affiliate / Product Link <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="https://example.com/product"
              className="w-full h-11 rounded-xl bg-secondary border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Tags <span className="text-muted-foreground font-normal">({tags.length}/5)</span>
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="e.g. streetwear"
                className="flex-1 h-10 rounded-full bg-secondary border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="h-10 px-4 rounded-full bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-all"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <AnimatePresence>
            {status === "uploading" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-primary rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || status === "uploading" || status === "done"}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "uploading" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-4 h-4" /> Uploaded!</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Reel</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

