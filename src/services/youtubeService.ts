import { SocialAccountDocument } from "../models/SocialAccount";
import { decryptToken, encryptToken } from "./tokenEncryption";
import { env } from "../config/env";

export async function getYouTubeAccessToken(account: SocialAccountDocument) {
  const accessToken = account.encryptedAccessToken
    ? decryptToken(account.encryptedAccessToken)
    : undefined;
  if (
    accessToken &&
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return accessToken;
  }

  if (
    !account.encryptedRefreshToken ||
    !env.googleClientId ||
    !env.googleClientSecret
  ) {
    throw new Error("YouTube authorization needs to be reconnected");
  }

  const refreshToken = decryptToken(account.encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    account.status = "needs_attention";
    await account.save();
    throw new Error(
      data.error_description ?? "YouTube authorization needs to be reconnected",
    );
  }

  account.encryptedAccessToken = encryptToken(data.access_token);
  account.tokenExpiresAt = new Date(
    Date.now() + (data.expires_in ?? 3600) * 1000,
  );
  account.status = "connected";
  await account.save();
  return data.access_token;
}

export function getYouTubeVideoId(targetUrl: string) {
  const url = new URL(targetUrl);
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  return (
    url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/]+)/)?.[1]
  );
}

export async function validateYouTubeVideo(
  accessToken: string,
  targetUrl: string,
) {
  const videoId = getYouTubeVideoId(targetUrl);
  if (!videoId) throw new Error("The YouTube video URL is invalid");
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(videoId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = (await response.json()) as {
    items?: Array<{ snippet?: { title?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(data.error?.message ?? "YouTube video lookup failed");
  if (!data.items?.length)
    throw new Error("YouTube video was not found or is not accessible");
  return data.items[0].snippet?.title ?? "YouTube video";
}

export async function rateYouTubeVideo(
  accessToken: string,
  targetUrl: string,
  rating: "like" | "dislike",
) {
  const videoId = getYouTubeVideoId(targetUrl);
  if (!videoId) throw new Error("The YouTube video URL is invalid");
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos/rate?id=${encodeURIComponent(videoId)}&rating=${rating}`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      data?.error?.message ?? `Unable to ${rating} YouTube video`,
    );
  }
}

export async function getYouTubeVideoRating(
  accessToken: string,
  targetUrl: string,
) {
  const videoId = getYouTubeVideoId(targetUrl);
  if (!videoId) throw new Error("The YouTube video URL is invalid");
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos/getRating?id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json()) as {
    items?: Array<{ rating?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to verify YouTube rating");
  }
  return data.items?.[0]?.rating ?? "none";
}

export async function commentOnYouTubeVideo(
  accessToken: string,
  targetUrl: string,
  text: string,
) {
  const videoId = getYouTubeVideoId(targetUrl);
  if (!videoId) throw new Error("The YouTube video URL is invalid");
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: { snippet: { textOriginal: text } },
        },
      }),
    },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      data?.error?.message ?? "Unable to comment on YouTube video",
    );
  }
}
