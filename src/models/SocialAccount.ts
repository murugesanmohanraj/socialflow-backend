import mongoose, { Document, Model } from "mongoose";

export type SocialPlatform = "tiktok" | "youtube" | "facebook" | "instagram";
export type ConnectionStatus = "connected" | "needs_attention" | "disconnected";

export interface SocialAccountDocument extends Document {
  userId: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  platformAccountId: string;
  accountName: string;
  username?: string;
  email?: string;
  status: ConnectionStatus;
  lastActivityAt?: Date;
  provider?: "youtube" | "tiktok" | "facebook" | "instagram";
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  encryptedPassword?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const socialAccountSchema = new mongoose.Schema<SocialAccountDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["tiktok", "youtube", "facebook", "instagram"],
      required: true,
    },
    platformAccountId: { type: String, required: true },
    accountName: { type: String, required: true, trim: true, maxlength: 120 },
    username: { type: String, trim: true, maxlength: 120 },
    email: { type: String, lowercase: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ["connected", "needs_attention", "disconnected"],
      default: "connected",
    },
    lastActivityAt: Date,
    provider: {
      type: String,
      enum: ["youtube", "tiktok", "facebook", "instagram"],
    },
    encryptedAccessToken: { type: String, select: false },
    encryptedRefreshToken: { type: String, select: false },
    encryptedPassword: { type: String, select: false },
    tokenExpiresAt: Date,
  },
  { timestamps: true },
);

socialAccountSchema.index(
  { userId: 1, platform: 1, platformAccountId: 1 },
  { unique: true },
);

export const SocialAccount: Model<SocialAccountDocument> =
  mongoose.model<SocialAccountDocument>("SocialAccount", socialAccountSchema);
