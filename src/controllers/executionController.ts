import mongoose from "mongoose";
import { Request, Response } from "express";
import { Action } from "../models/Action";
import { Execution, ExecutionDocument } from "../models/Execution";
import { SocialAccount } from "../models/SocialAccount";
import { Activity } from "../models/Activity";
import {
  commentOnYouTubeVideo,
  getYouTubeAccessToken,
  getYouTubeVideoRating,
  rateYouTubeVideo,
  validateYouTubeVideo,
} from "../services/youtubeService";

const activeRunPromises = new Map<string, Promise<ExecutionDocument>>();

function processExecution(executionId: string) {
  void (async () => {
    const execution = await Execution.findById(executionId);
    if (!execution) return;

    const action = await Action.findById(execution.actionId);
    if (!action) return;

    execution.status = "running";
    execution.startedAt = new Date();
    await execution.save();

    for (const item of execution.items) {
      const startedAt = new Date();
      item.status = "running";
      item.startedAt = startedAt;
      await execution.save();

      let status: "success" | "failed" = "success";
      let message = "";
      try {
        const account = await SocialAccount.findOne({
          _id: item.accountId,
          userId: execution.userId,
        }).select("+encryptedAccessToken +encryptedRefreshToken");
        if (!account) throw new Error("Connected account was not found");
        if (account.platform !== "youtube") {
          throw new Error("This platform integration is not configured yet");
        }
        const accessToken = await getYouTubeAccessToken(account);
        if (action.likeContent || action.actionType === "Like video") {
          await rateYouTubeVideo(accessToken, execution.targetUrl, "like");
          const rating = await getYouTubeVideoRating(
            accessToken,
            execution.targetUrl,
          );
          if (rating !== "like") {
            throw new Error(
              `YouTube accepted the request, but the authorized account rating is '${rating}'`,
            );
          }
          message = "YouTube video liked successfully";
        } else if (action.actionType === "Dislike video") {
          await rateYouTubeVideo(accessToken, execution.targetUrl, "dislike");
          const rating = await getYouTubeVideoRating(
            accessToken,
            execution.targetUrl,
          );
          if (rating !== "dislike") {
            throw new Error(
              `YouTube accepted the request, but the authorized account rating is '${rating}'`,
            );
          }
          message =
            "YouTube video disliked successfully by the connected account";
        }
        if (action.postComment || action.actionType === "Comment on video") {
          const assignedComment = action.commentAssignments?.find(
            (assignment) =>
              String(assignment.accountId) === String(item.accountId),
          )?.commentText;
          const text = assignedComment ?? action.commentText;
          if (!text) throw new Error("Comment text is missing");
          await commentOnYouTubeVideo(accessToken, execution.targetUrl, text);
          message = message
            ? `${message}; comment posted successfully on YouTube`
            : "Comment posted successfully on YouTube";
        }
        if (action.actionType === "Watch video") {
          const videoTitle = await validateYouTubeVideo(
            accessToken,
            execution.targetUrl,
          );
          message = `YouTube video watched successfully: ${videoTitle}`;
        }
        if (
          !action.likeContent &&
          !action.postComment &&
          action.actionType !== "Like video" &&
          action.actionType !== "Comment on video" &&
          action.actionType !== "Watch video"
        ) {
          const videoTitle = await validateYouTubeVideo(
            accessToken,
            execution.targetUrl,
          );
          message = `YouTube video validated successfully: ${videoTitle}`;
        }
        item.status = "completed";
      } catch (error) {
        status = "failed";
        message = error instanceof Error ? error.message : "Action failed";
        item.status = "failed";
        item.errorMessage = message;
      }
      const completedAt = new Date();
      item.message = message;
      item.completedAt = completedAt;
      await execution.save();

      await Activity.create({
        userId: execution.userId,
        executionId: execution._id,
        actionId: action._id,
        accountId: item.accountId,
        accountName: item.accountName,
        platform: execution.platform,
        action: action.title,
        targetUrl: execution.targetUrl,
        status,
        message,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      });
    }

    execution.status = execution.items.every(
      (item) => item.status === "completed",
    )
      ? "completed"
      : "failed";
    execution.completedAt = new Date();
    await execution.save();
  })().catch((error: unknown) => {
    console.error("Execution worker failed", error);
  });
}

export async function runAction(req: Request, res: Response) {
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

  const lockKey = `${String(req.userId)}:${String(action._id)}`;
  let executionPromise = activeRunPromises.get(lockKey);
  if (!executionPromise) {
    executionPromise = (async () => {
      const existingExecution = await Execution.findOne({
        userId: req.userId,
        actionId: action._id,
        status: { $in: ["queued", "running"] },
      }).sort({ createdAt: -1 });
      if (existingExecution) return existingExecution;

      const accounts = await SocialAccount.find({
        userId: req.userId,
        _id: { $in: action.accountIds },
        status: { $ne: "disconnected" },
      });
      if (accounts.length !== action.accountIds.length) {
        throw new Error("One or more selected accounts are unavailable");
      }

      const createdExecution = await Execution.create({
        userId: req.userId,
        actionId: action._id,
        platform: action.platform,
        targetUrl: action.targetUrl,
        status: "queued",
        items: accounts.map((account) => ({
          accountId: account._id,
          accountName: account.username || account.accountName,
          status: "pending",
        })),
      });

      processExecution(String(createdExecution._id));
      return createdExecution;
    })();
    activeRunPromises.set(lockKey, executionPromise);
  }

  try {
    const execution = await executionPromise;
    res.status(202).json({ success: true, execution });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to start execution",
    });
  } finally {
    if (activeRunPromises.get(lockKey) === executionPromise) {
      activeRunPromises.delete(lockKey);
    }
  }
}

export async function getExecution(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.executionId)) {
    res.status(400).json({ success: false, message: "Invalid execution ID" });
    return;
  }

  const execution = await Execution.findOne({
    _id: req.params.executionId,
    userId: req.userId,
  });
  if (!execution) {
    res.status(404).json({ success: false, message: "Execution not found" });
    return;
  }

  res.json({ success: true, execution });
}

export async function getExecutionResults(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.executionId)) {
    res.status(400).json({ success: false, message: "Invalid execution ID" });
    return;
  }

  const execution = await Execution.findOne({
    _id: req.params.executionId,
    userId: req.userId,
  });
  if (!execution) {
    res.status(404).json({ success: false, message: "Execution not found" });
    return;
  }

  const successful = execution.items.filter(
    (item) => item.status === "completed",
  ).length;
  const failed = execution.items.filter(
    (item) => item.status === "failed",
  ).length;
  res.json({
    success: true,
    execution,
    summary: { total: execution.items.length, successful, failed },
  });
}
