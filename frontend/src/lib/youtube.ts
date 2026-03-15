import { supabase } from "@/lib/supabase";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  subscriberCount: number | null;
  subscriberCountHidden: boolean;
  videoCount: number;
  viewCount: number;
}

/**
 * Calls the YouTube Data API using the Google OAuth access token that
 * Supabase stores as `session.provider_token` after a Google SSO login
 * with the youtube.readonly scope.
 *
 * Returns null when the account has no YouTube channel.
 * Throws when the token is missing or the API responds with an error.
 */
export async function fetchMyYouTubeChannel(): Promise<YouTubeChannel | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;

  if (!providerToken) {
    throw new Error(
      "No Google token found. Please sign out and sign back in — " +
        "make sure to grant YouTube access when prompted."
    );
  }

  const res = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`,
    {
      headers: { Authorization: `Bearer ${providerToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Google token is invalid or missing youtube.readonly scope. " +
          "Please sign out and sign in again."
      );
    }
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const channels: unknown[] = data?.items ?? [];

  if (channels.length === 0) return null;

  const ch = channels[0] as {
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails?: { default?: { url: string }; medium?: { url: string } };
    };
    statistics: {
      hiddenSubscriberCount?: boolean;
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  };

  const stats = ch.statistics;
  const snippet = ch.snippet;

  return {
    id: ch.id,
    name: snippet.title,
    description: snippet.description,
    thumbnail:
      snippet.thumbnails?.default?.url ??
      snippet.thumbnails?.medium?.url ??
      null,
    subscriberCount: stats.hiddenSubscriberCount
      ? null
      : parseInt(stats.subscriberCount ?? "0", 10),
    subscriberCountHidden: stats.hiddenSubscriberCount ?? false,
    videoCount: parseInt(stats.videoCount ?? "0", 10),
    viewCount: parseInt(stats.viewCount ?? "0", 10),
  };
}

/**
 * Saves the channel data back to the user's profile row in Supabase.
 */
export async function saveChannelToProfile(
  userId: string,
  channel: YouTubeChannel
) {
  const { error } = await supabase.from("profiles").update({
    youtube_channel_id: channel.id,
    youtube_channel_name: channel.name,
    youtube_channel_thumbnail: channel.thumbnail,
    youtube_subscriber_count: channel.subscriberCount,
    youtube_video_count: channel.videoCount,
    youtube_last_checked: new Date().toISOString(),
  }).eq("id", userId);

  if (error) throw error;
}
