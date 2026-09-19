import mongoose from "mongoose";
import { Request, Response } from "express";
import { SocialAccount } from "../models/SocialAccount";
import {
  requestInstagramVerificationCode,
  runInstagramAction,
  submitInstagramVerificationCode,
} from "../services/instagramBrowserService";
import { decryptToken } from "../services/tokenEncryption";

export async function runInstagramBrowserAction(req: Request, res: Response) {
  const {
    url,
    actionType,
    commentText,
    accountId,
    accountIds,
    commentAssignments,
  } = req.body as {
    url?: unknown;
    actionType?: "like" | "comment" | "like_comment";
    commentText?: unknown;
    accountId?: unknown;
    accountIds?: unknown;
    commentAssignments?: unknown;
  };

  if (typeof url !== "string" || !url.trim()) {
    res
      .status(400)
      .json({ success: false, message: "Instagram URL is required" });
    return;
  }

  if (
    !actionType ||
    !["like", "comment", "like_comment"].includes(actionType)
  ) {
    res
      .status(400)
      .json({ success: false, message: "Valid actionType is required" });
    return;
  }

  const requestedAccountIds = Array.isArray(accountIds)
    ? accountIds
    : typeof accountId === "string"
      ? [accountId]
      : [];

  if (
    requestedAccountIds.length === 0 ||
    requestedAccountIds.some(
      (value) => typeof value !== "string" || !mongoose.isValidObjectId(value),
    )
  ) {
    res.status(400).json({
      success: false,
      message: "A valid connected Instagram account is required",
    });
    return;
  }

  try {
    const accounts = await SocialAccount.find({
      _id: { $in: requestedAccountIds },
      userId: req.userId,
      platform: "instagram",
    }).select("+encryptedPassword email accountName");

    if (accounts.length !== requestedAccountIds.length) {
      res.status(404).json({
        success: false,
        message: "Connected Instagram account was not found.",
      });
      return;
    }

    if (accounts.some((account) => !account.encryptedPassword)) {
      res.status(400).json({
        success: false,
        message: "This Instagram account does not have a stored password.",
      });
      return;
    }

    const results = await Promise.all(
      accounts.map((account) =>
        runInstagramAction(
          String(req.userId),
          String(account._id),
          url,
          actionType,
          Array.isArray(commentAssignments)
            ? (() => {
                const assignment = commentAssignments.find(
                  (item) =>
                    item &&
                    typeof item === "object" &&
                    "accountId" in item &&
                    item.accountId === String(account._id),
                );
                return assignment &&
                  "commentText" in assignment &&
                  typeof assignment.commentText === "string"
                  ? assignment.commentText
                  : undefined;
              })()
            : typeof commentText === "string"
              ? commentText
              : undefined,
          account.email,
          decryptToken(account.encryptedPassword!),
        ).then((result) => ({
          accountId: String(account._id),
          accountName: account.accountName ?? account.email,
          ...result,
        })),
      ),
    );

    res.json({
      success: results.every((result) => result.success),
      message: results
        .map((result) => `${result.accountName}: ${result.message}`)
        .join(" "),
      results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to run Instagram action",
    });
  }
}

export async function submitInstagramBrowserVerification(
  req: Request,
  res: Response,
) {
  const { accountId, code } = req.body as {
    accountId?: unknown;
    code?: unknown;
  };

  if (
    typeof accountId !== "string" ||
    !mongoose.isValidObjectId(accountId) ||
    typeof code !== "string" ||
    !code.trim()
  ) {
    res.status(400).json({
      success: false,
      message: "A valid account ID and verification code are required",
    });
    return;
  }

  try {
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.userId,
      platform: "instagram",
    }).select("_id");

    if (!account) {
      res
        .status(404)
        .json({ success: false, message: "Instagram account was not found." });
      return;
    }

    const result = await submitInstagramVerificationCode(
      String(req.userId),
      accountId,
      code.trim(),
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to submit verification code",
    });
  }
}

export async function requestInstagramBrowserVerificationCode(
  req: Request,
  res: Response,
) {
  const { accountId } = req.body as { accountId?: unknown };

  if (typeof accountId !== "string" || !mongoose.isValidObjectId(accountId)) {
    res.status(400).json({
      success: false,
      message: "A valid Instagram account ID is required",
    });
    return;
  }

  try {
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.userId,
      platform: "instagram",
    }).select("_id");

    if (!account) {
      res
        .status(404)
        .json({ success: false, message: "Instagram account was not found." });
      return;
    }

    const result = await requestInstagramVerificationCode(
      String(req.userId),
      accountId,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to request a new verification code",
    });
  }
}
