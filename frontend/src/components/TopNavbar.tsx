import { Search, Upload, User, LogIn, LogOut } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useState, useEffect } from "react";

const TopNavbar = () => {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/explore");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass border-b border-border/50 hidden md:flex items-center justify-between px-4 md:px-6 z-50">
      <Link to="/" className="text-2xl font-bold font-display text-gradient shrink-0">
        Zyfit
      </Link>

      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search styles, creators..."
            className="w-full h-10 pl-10 pr-24 rounded-full bg-secondary/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2">
        {!loading && user && (
          <Link
            to="/upload"
            className="h-10 px-5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
        )}

        {loading ? (
          <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity overflow-hidden ring-2 ring-primary/20"
              title={profile?.full_name ?? user.email ?? "Profile"}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "avatar"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </Link>
            <button
              onClick={signOut}
              title="Sign out"
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <LogOut className="w-5 h-5 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="h-10 px-5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-5 h-5" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
