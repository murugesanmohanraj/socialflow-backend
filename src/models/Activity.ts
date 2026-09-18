import mongoose, { Document, Model } from "mongoose";

export type ActivityStatus = "success" | "failed";

export interface ActivityDocument extends Document {
  userId: mongoose.Types.ObjectId;
  executionId: mongoose.Types.ObjectId;
  actionId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  accountName: string;
  platform: "tiktok" | "youtube" | "facebook" | "instagram";
  action: string;
  targetUrl: string;
  status: ActivityStatus;
  message: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  createdAt: Date;
}

const activitySchema = new mongoose.Schema<ActivityDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Execution",
      required: true,
      index: true,
    },
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Action",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    accountName: { type: String, required: true },
    platform: {
      type: String,
      enum: ["tiktok", "youtube", "facebook", "instagram"],
      required: true,
    },
    action: { type: String, required: true },
    targetUrl: { type: String, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    message: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Activity: Model<ActivityDocument> =
  mongoose.model<ActivityDocument>("Activity", activitySchema);
