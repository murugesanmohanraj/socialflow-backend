import mongoose, { Document, Model } from "mongoose";

export type ReviewItemStatus = "pending" | "opened" | "completed";

export interface ReviewItem {
  accountId: mongoose.Types.ObjectId;
  accountName: string;
  status: ReviewItemStatus;
  openedAt?: Date;
  completedAt?: Date;
}

export interface ReviewSessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  platform: "youtube";
  targetUrl: string;
  items: ReviewItem[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewItemSchema = new mongoose.Schema<ReviewItem>(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    accountName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "opened", "completed"],
      default: "pending",
    },
    openedAt: Date,
    completedAt: Date,
  },
  { _id: false },
);

const reviewSessionSchema = new mongoose.Schema<ReviewSessionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["youtube"],
      default: "youtube",
      required: true,
    },
    targetUrl: { type: String, required: true },
    items: { type: [reviewItemSchema], required: true },
  },
  { timestamps: true },
);

export const ReviewSession: Model<ReviewSessionDocument> =
  mongoose.model<ReviewSessionDocument>("ReviewSession", reviewSessionSchema);
