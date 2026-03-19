import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import TopNavbar from "@/components/TopNavbar";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import UploadPage from "@/pages/UploadPage";
import ProfilePage from "@/pages/ProfilePage";
import SavedPage from "@/pages/SavedPage";
import NotFound from "@/pages/NotFound";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <TopNavbar />
            <DesktopSidebar />
            <div className="md:ml-16 lg:ml-52 md:pt-16">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
