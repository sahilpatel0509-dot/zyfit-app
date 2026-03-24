import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/contexts/AuthContext";
import { DbReel } from "@/hooks/use-reels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function AdminPage() {
    const { profile, loading: authLoading } = useAuth();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [reels, setReels] = useState<DbReel[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [loadingReels, setLoadingReels] = useState(false);

    useEffect(() => {
        if (profile?.role === "admin") {
            fetchProfiles();
            fetchReels();
        }
    }, [profile]);

    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        if (error) {
            toast.error("Failed to load profiles");
        } else {
            setProfiles(data || []);
        }
        setLoadingProfiles(false);
    };

    const fetchReels = async () => {
        setLoadingReels(true);
        const { data, error } = await supabase.from("reels").select(`
      *,
      profiles:user_id ( id, username, full_name, avatar_url )
    `).order("created_at", { ascending: false });

        if (error) {
            toast.error("Failed to load reels");
        } else {
            setReels(data || []);
        }
        setLoadingReels(false);
    };

    const handleDeleteProfile = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        // Note: Deleting a profile directly from frontend requires RLS policies allowing the admin role to do so.
        const { error } = await supabase.from("profiles").delete().eq("id", userId);

        if (error) {
            toast.error("Failed to delete user: " + error.message);
        } else {
            toast.success("User deleted successfully!");
            setProfiles(profiles.filter(p => p.id !== userId));
        }
    };

    const handleDeleteReel = async (reelId: string, mediaUrl?: string) => {
        if (!window.confirm("Are you sure you want to delete this reel?")) return;

        try {
            // 1. Delete associated products first (safeguard)
            await supabase.from("reel_products").delete().eq("reel_id", reelId);

            // 2. Delete media from storage if URL is provided
            if (mediaUrl) {
                try {
                    const urlParts = mediaUrl.split("/reels/");
                    if (urlParts.length > 1) {
                        const storagePath = urlParts[1];
                        await supabase.storage.from("reels").remove([storagePath]);
                    }
                } catch (storageErr) {
                    console.error("Failed to extract or delete storage file:", storageErr);
                }
            }

            // 3. Delete the reel record
            const { error } = await supabase.from("reels").delete().eq("id", reelId);
            if (error) throw error;

            toast.success("Reel deleted successfully!");
            setReels(reels.filter(r => r.id !== reelId));
        } catch (err: any) {
            toast.error(err.message || "Failed to delete reel");
        }
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (profile?.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
                <p className="text-muted-foreground mb-8">
                    You do not have permission to access the admin portal.
                </p>
                <Button onClick={() => window.location.href = "/"}>Return to Home</Button>
            </div>
        );
    }

    return (
        <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Manage users and content on Zyfit.
                </p>
            </div>

            <Tabs defaultValue="profiles" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="profiles">All Profiles</TabsTrigger>
                    <TabsTrigger value="reels">All Reels</TabsTrigger>
                </TabsList>

                <TabsContent value="profiles" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profiles ({profiles.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProfiles ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                            ) : (
                                <div className="border rounded-md overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Avatar</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Full Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {profiles.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell>
                                                        {p.avatar_url ? (
                                                            <img src={p.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">U</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{p.username || "anonymous"}</TableCell>
                                                    <TableCell>{p.full_name || "-"}</TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                            {p.role || "user"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={p.id === profile.id} // Prevent admin from deleting themselves
                                                            onClick={() => handleDeleteProfile(p.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {profiles.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                                        No profiles found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reels" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reels ({reels.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingReels ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                            ) : (
                                <div className="border rounded-md overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Video</TableHead>
                                                <TableHead>Creator</TableHead>
                                                <TableHead>Caption</TableHead>
                                                <TableHead>Stats</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reels.map((r: any) => (
                                                <TableRow key={r.id}>
                                                    <TableCell>
                                                        <video
                                                            src={r.media_url}
                                                            className="w-16 h-24 object-cover rounded-md bg-black"
                                                            muted
                                                            playsInline
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {r.profiles ? (Array.isArray(r.profiles) ? r.profiles[0]?.username : r.profiles?.username) : "Unknown"}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate">
                                                        {r.caption || "No caption"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs text-muted-foreground space-y-1">
                                                            <div>Likes: {r.likes_count ?? '-'}</div>
                                                            <div>Comments: {r.comments_count ?? '-'}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteReel(r.id, r.media_url)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {reels.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                                        No reels found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
