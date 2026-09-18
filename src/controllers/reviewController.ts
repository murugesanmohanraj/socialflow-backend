import mongoose from "mongoose";
import { Request, Response } from "express";
import { Activity } from "../models/Activity";
import { ReviewSession, ReviewItemStatus } from "../models/ReviewSession";
import { SocialAccount } from "../models/SocialAccount";
import { validateYouTubeVideo } from "../services/youtubeService";

function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "youtu.be" ||
        url.hostname === "youtube.com" ||
        url.hostname.endsWith(".youtube.com"))
    );
  } catch {
    return false;
  }
}

export async function createReview(req: Request, res: Response) {
  const { targetUrl, accountIds } = req.body as Record<string, unknown>;
  if (typeof targetUrl !== "string" || !isYouTubeUrl(targetUrl.trim())) {
    res
      .status(400)
      .json({ success: false, message: "Provide a valid YouTube URL" });
    return;
  }
  if (
    !Array.isArray(accountIds) ||
    accountIds.length === 0 ||
    accountIds.some(
      (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
    )
  ) {
    res
      .status(400)
      .json({
        success: false,
        message: "Select at least one valid YouTube account",
      });
    return;
  }

  const accounts = await SocialAccount.find({
    userId: req.userId,
    _id: { $in: accountIds },
    platform: "youtube",
    status: "connected",
  }).select("accountName username");
  if (accounts.length !== accountIds.length) {
    res
      .status(400)
      .json({
        success: false,
        message: "All selected accounts must be connected YouTube accounts",
      });
    return;
  }

  const review = await ReviewSession.create({
    userId: req.userId,
    platform: "youtube",
    targetUrl: targetUrl.trim(),
    items: accounts.map((account) => ({
      accountId: account._id,
      accountName: account.username || account.accountName,
      status: "pending",
    })),
  });

  res.status(201).json({ success: true, review });
}

export async function getReview(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.reviewId)) {
    res.status(400).json({ success: false, message: "Invalid review ID" });
    return;
  }
  const review = await ReviewSession.findOne({
    _id: req.params.reviewId,
    userId: req.userId,
  });
  if (!review) {
    res
      .status(404)
      .json({ success: false, message: "Review session not found" });
    return;
  }
  res.json({ success: true, review });
}

export async function updateReviewItem(req: Request, res: Response) {
  const { status } = req.body as { status?: ReviewItemStatus };
  if (
    !mongoose.isValidObjectId(req.params.reviewId) ||
    !mongoose.isValidObjectId(req.params.accountId)
  ) {
    res
      .status(400)
      .json({ success: false, message: "Invalid review or account ID" });
    return;
  }
  if (status !== "opened" && status !== "completed") {
    res
      .status(400)
      .json({ success: false, message: "Status must be opened or completed" });
    return;
  }

  const review = await ReviewSession.findOne({
    _id: req.params.reviewId,
    userId: req.userId,
  });
  if (!review) {
    res
      .status(404)
      .json({ success: false, message: "Review session not found" });
    return;
  }
  const item = review.items.find(
    (entry) => String(entry.accountId) === req.params.accountId,
  );
  if (!item) {
    res
      .status(404)
      .json({ success: false, message: "Account is not part of this review" });
    return;
  }

  const now = new Date();
  item.status = status;
  if (status === "opened") item.openedAt = now;
  if (status === "completed") {
    item.openedAt ??= now;
    item.completedAt = now;
  }
  await review.save();

  if (status === "completed") {
    await Activity.create({
      userId: review.userId,
      executionId: review._id,
      actionId: review._id,
      accountId: item.accountId,
      accountName: item.accountName,
      platform: "youtube",
      action: "Manual video review",
      targetUrl: review.targetUrl,
      status: "success",
      message: "User marked the video review as completed",
      startedAt: item.openedAt ?? now,
      completedAt: now,
      durationMs: now.getTime() - (item.openedAt?.getTime() ?? now.getTime()),
    });
  }

  res.json({ success: true, review });
}
