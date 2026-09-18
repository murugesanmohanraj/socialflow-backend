import mongoose from "mongoose";
import { Request, Response } from "express";
import { SocialAccount } from "../models/SocialAccount";
import { runTikTokAction } from "../services/tiktokBrowserService";
import { decryptToken } from "../services/tokenEncryption";

export async function runTikTokBrowserAction(req: Request, res: Response) {
  const { url, actionType, commentText, accountId } = req.body as {
    url?: unknown;
    actionType?: "like" | "comment" | "like_comment" | "watch";
    commentText?: unknown;
    accountId?: unknown;
  };

  if (typeof url !== "string" || !url.trim()) {
    res.status(400).json({ success: false, message: "TikTok URL is required" });
    return;
  }

  if (
    !actionType ||
    !["like", "comment", "like_comment", "watch"].includes(actionType)
  ) {
    res
      .status(400)
      .json({ success: false, message: "Valid actionType is required" });
    return;
  }

  if (typeof accountId !== "string" || !mongoose.isValidObjectId(accountId)) {
    res.status(400).json({
      success: false,
      message: "A valid connected TikTok account is required",
    });
    return;
  }

  try {
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.userId,
      platform: "tiktok",
    }).select("+encryptedPassword email accountName");

    if (!account) {
      res.status(404).json({
        success: false,
        message: "Connected TikTok account was not found.",
      });
      return;
    }

    if (!account.encryptedPassword) {
      res.status(400).json({
        success: false,
        message: "This TikTok account does not have a stored password.",
      });
      return;
    }

    const result = await runTikTokAction(
      String(req.userId),
      String(account._id),
      url,
      actionType,
      typeof commentText === "string" ? commentText : undefined,
      account.email,
      decryptToken(account.encryptedPassword),
    );

    res.json({
      success: result.success,
      message: result.message,
      url: result.url,
      title: result.title,
      clickedLike: result.clickedLike,
      postedComment: result.postedComment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to run TikTok action",
    });
  }
}
