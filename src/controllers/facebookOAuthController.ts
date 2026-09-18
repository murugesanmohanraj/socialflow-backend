import { Request, Response } from "express";
import { env } from "../config/env";

function configured() {
  return Boolean(
    process.env.FACEBOOK_APP_ID &&
    process.env.FACEBOOK_APP_SECRET &&
    process.env.FACEBOOK_REDIRECT_URI,
  );
}

export function startFacebookOAuth(req: Request, res: Response) {
  if (!configured()) {
    res.status(503).json({
      success: false,
      message: "Facebook OAuth is not configured",
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID as string,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI as string,
    scope: "email,pages_show_list,pages_manage_posts",
    response_type: "code",
    state: req.userId ?? "",
  });

  res.json({
    success: true,
    authorizationUrl: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`,
  });
}

export async function facebookOAuthCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  if (error || typeof code !== "string") {
    return res.redirect(`${env.clientUrl}/accounts?oauth=cancelled`);
  }

  if (!configured()) {
    return res.redirect(`${env.clientUrl}/accounts?oauth=not-configured`);
  }

  try {
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID as string,
          client_secret: process.env.FACEBOOK_APP_SECRET as string,
          redirect_uri: process.env.FACEBOOK_REDIRECT_URI as string,
          code,
        }),
      },
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: { message?: string };
    };

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error?.message ?? "Facebook token exchange failed",
      );
    }

    return res.redirect(`${env.clientUrl}/accounts?oauth=facebook-success`);
  } catch (callbackError) {
    console.error("Facebook OAuth callback failed", callbackError);
    return res.redirect(`${env.clientUrl}/accounts?oauth=failed`);
  }
}
