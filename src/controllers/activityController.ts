import mongoose from "mongoose";
import { Request, Response } from "express";
import { Activity } from "../models/Activity";

export async function listActivity(req: Request, res: Response) {
  const filter: Record<string, unknown> = { userId: req.userId };
  if (req.query.status === "success" || req.query.status === "failed")
    filter.status = req.query.status;
  if (req.query.platform === "youtube" || req.query.platform === "tiktok")
    filter.platform = req.query.platform;
  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ success: true, activities });
}

export async function getActivity(req: Request, res: Response) {
  if (!mongoose.isValidObjectId(req.params.activityId)) {
    res.status(400).json({ success: false, message: "Invalid activity ID" });
    return;
  }
  const activity = await Activity.findOne({
    _id: req.params.activityId,
    userId: req.userId,
  });
  if (!activity) {
    res.status(404).json({ success: false, message: "Activity not found" });
    return;
  }
  res.json({ success: true, activity });
}
