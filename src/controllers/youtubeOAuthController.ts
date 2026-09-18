import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { SocialAccount } from "../models/SocialAccount";
import { encryptToken } from "../services/tokenEncryption";

const scopes = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function configured() {
  return Boolean(
    env.googleClientId && env.googleClientSecret && env.googleRedirectUri,
  );
}

export function startYouTubeOAuth(req: Request, res: Response) {
  if (!configured()) {
    res
      .status(503)
      .json({ success: false, message: "YouTube OAuth is not configured" });
    return;
  }

  const state = jwt.sign(
    { userId: req.userId, nonce: crypto.randomBytes(16).toString("hex") },
    env.jwtSecret,
    { expiresIn: "10m" },
  );
  const params = new URLSearchParams({
    client_id: env.googleClientId as string,
    redirect_uri: env.googleRedirectUri as string,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.json({
    success: true,
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}

export async function youtubeOAuthCallback(req: Request, res: Response) {
  if (!configured())
    return res.redirect(`${env.clientUrl}/accounts?oauth=not-configured`);
  const { code, state, error } = req.query;
  if (error || typeof code !== "string" || typeof state !== "string")
    return res.redirect(`${env.clientUrl}/accounts?oauth=cancelled`);

  try {
    const payload = jwt.verify(state, env.jwtSecret) as { userId?: string };
    if (!payload.userId) throw new Error("Invalid OAuth state");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId as string,
        client_secret: env.googleClientSecret as string,
        redirect_uri: env.googleRedirectUri as string,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenResponse.ok || !tokens.access_token)
      throw new Error("Google token exchange failed");
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const channelData = (await channelResponse.json()) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string; customUrl?: string };
      }>;
      error?: { message?: string; status?: string };
    };
    if (!channelResponse.ok) {
      throw new Error(
        `YouTube channels API failed (${channelResponse.status}): ${channelData.error?.message ?? "unknown error"}`,
      );
    }
    const channel = channelData.items?.[0];
    if (!channel) {
      return res.redirect(`${env.clientUrl}/accounts?oauth=no-youtube-channel`);
    }
    await SocialAccount.findOneAndUpdate(
      {
        userId: payload.userId,
        platform: "youtube",
        platformAccountId: channel.id,
      },
      {
        userId: payload.userId,
        platform: "youtube",
        provider: "youtube",
        platformAccountId: channel.id,
        accountName: channel.snippet?.title ?? "YouTube channel",
        username: channel.snippet?.customUrl,
        status: "connected",
        encryptedAccessToken: encryptToken(tokens.access_token),
        ...(tokens.refresh_token
          ? { encryptedRefreshToken: encryptToken(tokens.refresh_token) }
          : {}),
        tokenExpiresAt: new Date(
          Date.now() + (tokens.expires_in ?? 3600) * 1000,
        ),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.redirect(`${env.clientUrl}/accounts?oauth=youtube-success`);
  } catch (callbackError) {
    console.error("YouTube OAuth callback failed", callbackError);
    return res.redirect(`${env.clientUrl}/accounts?oauth=failed`);
  }
}
