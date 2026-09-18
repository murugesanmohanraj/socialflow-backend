import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { SocialAccount } from "../models/SocialAccount";
import { encryptToken } from "../services/tokenEncryption";

function configured() {
  return Boolean(
    env.tiktokClientKey && env.tiktokClientSecret && env.tiktokRedirectUri,
  );
}

export function startTikTokOAuth(req: Request, res: Response) {
  if (!configured()) {
    res.status(503).json({
      success: false,
      message: "TikTok OAuth is not configured",
    });
    return;
  }

  const state = jwt.sign(
    { userId: req.userId, nonce: crypto.randomBytes(16).toString("hex") },
    env.jwtSecret,
    { expiresIn: "10m" },
  );
  const params = new URLSearchParams({
    client_key: env.tiktokClientKey as string,
    response_type: "code",
    scope: "user.info.basic",
    redirect_uri: env.tiktokRedirectUri as string,
    state,
  });

  res.json({
    success: true,
    authorizationUrl: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
  });
}

export async function tiktokOAuthCallback(req: Request, res: Response) {
  if (!configured()) {
    return res.redirect(`${env.clientUrl}/accounts?oauth=not-configured`);
  }

  const { code, state, error } = req.query;
  if (error || typeof code !== "string" || typeof state !== "string") {
    return res.redirect(`${env.clientUrl}/accounts?oauth=cancelled`);
  }

  try {
    const payload = jwt.verify(state, env.jwtSecret) as { userId?: string };
    if (!payload.userId) throw new Error("Invalid OAuth state");

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: env.tiktokClientKey as string,
          client_secret: env.tiktokClientSecret as string,
          code,
          grant_type: "authorization_code",
          redirect_uri: env.tiktokRedirectUri as string,
        }),
      },
    );
    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      open_id?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !tokens.access_token || !tokens.open_id) {
      throw new Error(
        `TikTok token exchange failed: ${tokens.error_description ?? tokens.error ?? "unknown error"}`,
      );
    }

    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const userData = (await userResponse.json()) as {
      data?: {
        user?: { open_id?: string; display_name?: string; username?: string };
      };
      error?: { message?: string };
    };
    if (!userResponse.ok || !userData.data?.user) {
      throw new Error(
        `TikTok user lookup failed: ${userData.error?.message ?? "unknown error"}`,
      );
    }

    const user = userData.data.user;
    await SocialAccount.findOneAndUpdate(
      {
        userId: payload.userId,
        platform: "tiktok",
        platformAccountId: tokens.open_id,
      },
      {
        userId: payload.userId,
        platform: "tiktok",
        provider: "tiktok",
        platformAccountId: tokens.open_id,
        accountName: user.display_name ?? "TikTok account",
        username: user.username ? `@${user.username}` : undefined,
        status: "connected",
        encryptedAccessToken: encryptToken(tokens.access_token),
        ...(tokens.refresh_token
          ? { encryptedRefreshToken: encryptToken(tokens.refresh_token) }
          : {}),
        tokenExpiresAt: new Date(
          Date.now() + (tokens.expires_in ?? 86400) * 1000,
        ),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.redirect(`${env.clientUrl}/accounts?oauth=tiktok-success`);
  } catch (callbackError) {
    console.error("TikTok OAuth callback failed", callbackError);
    return res.redirect(`${env.clientUrl}/accounts?oauth=failed`);
  }
}
