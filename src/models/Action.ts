import mongoose, { Document, Model } from "mongoose";

export type ActionPlatform = "tiktok" | "youtube" | "facebook" | "instagram";

export interface ActionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  platform: ActionPlatform;
  actionType: string;
  targetUrl: string;
  accountIds: mongoose.Types.ObjectId[];
  repetitions: number;
  likeContent: boolean;
  postComment: boolean;
  commentText?: string;
  commentAssignments?: Array<{
    accountId: mongoose.Types.ObjectId;
    commentText: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const actionSchema = new mongoose.Schema<ActionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    platform: {
      type: String,
      enum: ["tiktok", "youtube", "facebook", "instagram"],
      required: true,
    },
    actionType: { type: String, required: true, trim: true, maxlength: 80 },
    targetUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    accountIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SocialAccount",
        required: true,
      },
    ],
    repetitions: { type: Number, min: 0, max: 100, default: 0 },
    likeContent: { type: Boolean, default: false },
    postComment: { type: Boolean, default: false },
    commentText: { type: String, trim: true, maxlength: 1000 },
    commentAssignments: [
      {
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SocialAccount",
          required: true,
        },
        commentText: {
          type: String,
          trim: true,
          maxlength: 1000,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

actionSchema.index({ userId: 1, createdAt: -1 });

export const Action: Model<ActionDocument> = mongoose.model<ActionDocument>(
  "Action",
  actionSchema,
);
