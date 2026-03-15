import { Home, Compass, Plus, Bookmark, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Plus, label: "Upload", path: "/upload", isCenter: true },
  { icon: Bookmark, label: "Saved", path: "/saved" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 glass border-t border-border/50 flex items-center justify-around px-2 z-50 md:hidden">
      {navItems.map(({ icon: Icon, label, path, isCenter }) => {
        const active = location.pathname === path;
        return (
          <Link
            key={label}
            to={path}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all",
              isCenter
                ? "relative -mt-5"
                : active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isCenter ? (
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span className={cn("text-[10px] font-medium", isCenter && "mt-1")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
