import mongoose, { Document, Model } from "mongoose";
import { ActionPlatform } from "./Action";

export type ExecutionStatus = "queued" | "running" | "completed" | "failed";
export type ExecutionItemStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface ExecutionItem {
  accountId: mongoose.Types.ObjectId;
  accountName: string;
  status: ExecutionItemStatus;
  message?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExecutionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  actionId: mongoose.Types.ObjectId;
  platform: ActionPlatform;
  targetUrl: string;
  status: ExecutionStatus;
  items: ExecutionItem[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const executionItemSchema = new mongoose.Schema<ExecutionItem>(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    accountName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    message: String,
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { _id: false },
);

const executionSchema = new mongoose.Schema<ExecutionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Action",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["tiktok", "youtube", "facebook", "instagram"],
      required: true,
    },
    targetUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    items: { type: [executionItemSchema], required: true },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

export const Execution: Model<ExecutionDocument> =
  mongoose.model<ExecutionDocument>("Execution", executionSchema);
