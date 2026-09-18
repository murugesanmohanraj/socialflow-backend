import { Request, Response } from "express";
import { Action } from "../models/Action";
import { Activity } from "../models/Activity";
import { SocialAccount } from "../models/SocialAccount";

export async function getDashboardSummary(req: Request, res: Response) {
  const userId = req.userId;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [accounts, actionsToday, successfulToday, failedToday, recentActivity] =
    await Promise.all([
      SocialAccount.find({ userId }).select("platform status").lean(),
      Action.countDocuments({ userId, createdAt: { $gte: startOfToday } }),
      Activity.countDocuments({
        userId,
        status: "success",
        createdAt: { $gte: startOfToday },
      }),
      Activity.countDocuments({
        userId,
        status: "failed",
        createdAt: { $gte: startOfToday },
      }),
      Activity.find({ userId }).sort({ createdAt: -1 }).limit(4).lean(),
    ]);

  const connectedAccounts = accounts.filter(
    (account) => account.status === "connected",
  );
  const activePlatforms = new Set(
    connectedAccounts.map((account) => account.platform),
  ).size;
  const totalToday = successfulToday + failedToday;
  const completionRate = totalToday
    ? Math.round((successfulToday / totalToday) * 1000) / 10
    : 0;

  res.json({
    success: true,
    summary: {
      connectedAccounts: connectedAccounts.length,
      activeAccounts: connectedAccounts.length,
      activePlatforms,
      actionsToday,
      successfulToday,
      failedToday,
      completionRate,
      recentActivity,
    },
  });
}
