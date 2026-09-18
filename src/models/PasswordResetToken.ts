import mongoose, { Document, Model } from "mongoose";

export interface PasswordResetTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const passwordResetTokenSchema =
  new mongoose.Schema<PasswordResetTokenDocument>(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      tokenHash: { type: String, required: true, unique: true, index: true },
      expiresAt: { type: Date, required: true, index: true },
      usedAt: Date,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  );

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<PasswordResetTokenDocument> =
  mongoose.model<PasswordResetTokenDocument>(
    "PasswordResetToken",
    passwordResetTokenSchema,
  );
