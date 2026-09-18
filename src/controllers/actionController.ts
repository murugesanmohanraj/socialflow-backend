import mongoose from "mongoose";
import { Request, Response } from "express";
import { Action, ActionPlatform } from "../models/Action";
import { SocialAccount } from "../models/SocialAccount";

const urlHosts: Record<ActionPlatform, string[]> = {
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
};

function isSupportedUrl(platform: ActionPlatform, value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      urlHosts[platform].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}

function parsePlatform(value: unknown): ActionPlatform | undefined {
  if (value === "tiktok" || value === "TikTok") return "tiktok";
  if (value === "youtube" || value === "YouTube") return "youtube";
  if (value === "facebook" || value === "Facebook") return "facebook";
  if (value === "instagram" || value === "Instagram") return "instagram";
  return undefined;
}

async function findOwnedAccounts(
  userId: string,
  accountIds: unknown,
  platform: ActionPlatform,
) {
  if (
    !Array.isArray(accountIds) ||
    accountIds.length === 0 ||
    accountIds.some(
      (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
    )
  )
    return null;
  const accounts = await SocialAccount.find({
    userId,
    _id: { $in: accountIds },
    platform,
    status: { $ne: "disconnected" },
  });
  return accounts.length === accountIds.length ? accounts : null;
}

export async function createAction(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const platform = parsePlatform(body.platform);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const actionType =
    typeof body.actionType === "string" ? body.actionType.trim() : "";
  const targetUrl =
    typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  const commentText =
    typeof body.commentText === "string" ? body.commentText.trim() : "";
  const commentAssignments = Array.isArray(body.commentAssignments)
    ? body.commentAssignments.filter(
        (
          assignment,
        ): assignment is { accountId: string; commentText: string } =>
          Boolean(
            assignment &&
            typeof assignment === "object" &&
            typeof (assignment as { accountId?: unknown }).accountId ===
              "string" &&
            typeof (assignment as { commentText?: unknown }).commentText ===
              "string" &&
            (assignment as { commentText: string }).commentText.trim(),
          ),
      )
    : [];
  const repetitions =
    body.repetitions === undefined ? 1 : Number(body.repetitions);

  if (
    !platform ||
    !title ||
    !actionType ||
    !targetUrl ||
    !isSupportedUrl(platform, targetUrl)
  ) {
    res.status(400).json({
      success: false,
      message: "Provide a valid platform, action, and platform URL",
    });
    return;
  }
  if (!Number.isInteger(repetitions) || repetitions < 0 || repetitions > 100) {
    res.status(400).json({
      success: false,
      message: "Repetitions must be a whole number from 0 to 100",
    });
    return;
  }
  if (
    actionType === "Comment on video" &&
    !commentText &&
    commentAssignments.length === 0
  ) {
    res.status(400).json({
      success: false,
      message: "Comment text is required for a comment action",
    });
    return;
  }
  if (
    platform !== "youtube" &&
    ["Like video", "Dislike video", "Comment on video", "Watch video"].includes(
      actionType,
    )
  ) {
    res.status(400).json({
      success: false,
      message: "This YouTube action is not available for TikTok",
    });
    return;
  }

  const accounts = await findOwnedAccounts(
    String(req.userId),
    body.accountIds,
    platform,
  );
  if (!accounts) {
    res.status(400).json({
      success: false,
      message: "Select valid connected accounts for this platform",
    });
    return;
  }

  const action = await Action.create({
    userId: req.userId,
    title,
    platform,
    actionType,
    targetUrl,
    accountIds: accounts.map((account) => account._id),
    repetitions,
    likeContent: body.likeContent === true,
    postComment: body.postComment === true,
    commentAssignments: commentAssignments.length
      ? commentAssignments.map((assignment) => ({
          accountId: assignment.accountId,
          commentText: assignment.commentText.trim(),
        }))
      : undefined,
  });

  res.status(201).json({ success: true, action });
}

export async function listActions(req: Request, res: Response) {
  const actions = await Action.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  res.json({ success: true, actions });
}

export async function getAction(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.actionId)) {
    res.status(400).json({ success: false, message: "Invalid action ID" });
    return;
  }
  const action = await Action.findOne({
    _id: req.params.actionId,
    userId: req.userId,
  });
  if (!action) {
    res.status(404).json({ success: false, message: "Action not found" });
    return;
  }
  res.json({ success: true, action });
}

export async function updateAction(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.actionId)) {
    res.status(400).json({ success: false, message: "Invalid action ID" });
    return;
  }
  const action = await Action.findOneAndUpdate(
    { _id: req.params.actionId, userId: req.userId },
    req.body,
    { new: true, runValidators: true },
  );
  if (!action) {
    res.status(404).json({ success: false, message: "Action not found" });
    return;
  }
  res.json({ success: true, action });
}

export async function deleteAction(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.actionId)) {
    res.status(400).json({ success: false, message: "Invalid action ID" });
    return;
  }
  const action = await Action.findOneAndDelete({
    _id: req.params.actionId,
    userId: req.userId,
  });
  if (!action) {
    res.status(404).json({ success: false, message: "Action not found" });
    return;
  }
  res.json({ success: true, message: "Action deleted" });
}
