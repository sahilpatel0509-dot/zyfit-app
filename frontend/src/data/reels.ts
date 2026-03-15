import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import reel4 from "@/assets/reel-4.jpg";
import reel5 from "@/assets/reel-5.jpg";
import reel6 from "@/assets/reel-6.jpg";

export interface ReelData {
  id: string;
  image: string;
  username: string;
  avatar: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
}

export const reelsData: ReelData[] = [
  {
    id: "1",
    image: reel1,
    username: "street.vibes",
    avatar: "S",
    caption: "Bomber jacket season is here 🔥 Orange joggers + white kicks = unstoppable combo",
    tags: ["streetwear", "outfit", "fashion"],
    likes: 2431,
    comments: 89,
    shares: 45,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "2",
    image: reel2,
    username: "haute.maya",
    avatar: "H",
    caption: "Power suit energy ✨ When you mean business but make it fashion",
    tags: ["formal", "powersuit", "elegant"],
    likes: 5120,
    comments: 234,
    shares: 112,
    isLiked: true,
    isSaved: true,
  },
  {
    id: "3",
    image: reel3,
    username: "denim.daily",
    avatar: "D",
    caption: "Coffee shop core 🫖 Double denim done right",
    tags: ["casual", "denim", "cafe"],
    likes: 1876,
    comments: 56,
    shares: 23,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "4",
    image: reel4,
    username: "night.layers",
    avatar: "N",
    caption: "Layering is an art form 🎨 Oversized trench + leather = chef's kiss",
    tags: ["streetwear", "layers", "night"],
    likes: 3299,
    comments: 142,
    shares: 67,
    isLiked: false,
    isSaved: true,
  },
  {
    id: "5",
    image: reel5,
    username: "boho.soul",
    avatar: "B",
    caption: "Golden hour, golden jewelry ☀️ Bohemian dreams at sunset",
    tags: ["boho", "jewelry", "sunset"],
    likes: 4510,
    comments: 198,
    shares: 89,
    isLiked: true,
    isSaved: false,
  },
  {
    id: "6",
    image: reel6,
    username: "summer.fits",
    avatar: "F",
    caption: "Boardwalk ready 🏖️ Light fabrics, big vibes",
    tags: ["summer", "casual", "beach"],
    likes: 1243,
    comments: 41,
    shares: 19,
    isLiked: false,
    isSaved: false,
  },
];
