import mongoose from "mongoose";
import { Request, Response } from "express";
import { SocialAccount } from "../models/SocialAccount";
import { encryptToken } from "../services/tokenEncryption";

export async function connectFacebookAccount(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || !email.trim()) {
    res
      .status(400)
      .json({ success: false, message: "Facebook email is required" });
    return;
  }

  if (typeof password !== "string" || !password) {
    res
      .status(400)
      .json({ success: false, message: "Facebook password is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const account = await SocialAccount.findOneAndUpdate(
    {
      userId: req.userId,
      platform: "facebook",
      platformAccountId: `manual:${normalizedEmail}`,
    },
    {
      userId: req.userId,
      platform: "facebook",
      provider: "facebook",
      platformAccountId: `manual:${normalizedEmail}`,
      accountName: normalizedEmail,
      email: normalizedEmail,
      status: "connected",
      encryptedPassword: encryptToken(password),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({ success: true, account });
}

export async function connectTikTokAccount(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || !email.trim()) {
    res
      .status(400)
      .json({ success: false, message: "TikTok email is required" });
    return;
  }

  if (typeof password !== "string" || !password) {
    res
      .status(400)
      .json({ success: false, message: "TikTok password is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const account = await SocialAccount.findOneAndUpdate(
    {
      userId: req.userId,
      platform: "tiktok",
      platformAccountId: `manual:${normalizedEmail}`,
    },
    {
      userId: req.userId,
      platform: "tiktok",
      provider: "tiktok",
      platformAccountId: `manual:${normalizedEmail}`,
      accountName: normalizedEmail,
      email: normalizedEmail,
      status: "connected",
      encryptedPassword: encryptToken(password),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({ success: true, account });
}

export async function connectInstagramAccount(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || !email.trim()) {
    res
      .status(400)
      .json({ success: false, message: "Instagram email is required" });
    return;
  }

  if (typeof password !== "string" || !password) {
    res
      .status(400)
      .json({ success: false, message: "Instagram password is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const account = await SocialAccount.findOneAndUpdate(
    {
      userId: req.userId,
      platform: "instagram",
      platformAccountId: `manual:${normalizedEmail}`,
    },
    {
      userId: req.userId,
      platform: "instagram",
      provider: "instagram",
      platformAccountId: `manual:${normalizedEmail}`,
      accountName: normalizedEmail,
      email: normalizedEmail,
      status: "connected",
      encryptedPassword: encryptToken(password),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({ success: true, account });
}

export async function listAccounts(req: Request, res: Response) {
  const accounts = await SocialAccount.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  res.json({ success: true, accounts });
}

export async function getAccount(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.accountId)) {
    res.status(400).json({ success: false, message: "Invalid account ID" });
    return;
  }

  const account = await SocialAccount.findOne({
    _id: req.params.accountId,
    userId: req.userId,
  });
  if (!account) {
    res
      .status(404)
      .json({ success: false, message: "Social account not found" });
    return;
  }

  res.json({ success: true, account });
}

export async function disconnectAccount(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.accountId)) {
    res.status(400).json({ success: false, message: "Invalid account ID" });
    return;
  }

  const account = await SocialAccount.findOneAndUpdate(
    { _id: req.params.accountId, userId: req.userId },
    { status: "disconnected" },
    { new: true },
  );

  if (!account) {
    res
      .status(404)
      .json({ success: false, message: "Social account not found" });
    return;
  }

  res.json({ success: true, account });
}
