import mongoose, { Document, Model } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isActive: boolean;
  notifications: {
    completed: boolean;
    failed: boolean;
    disconnected: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    notifications: {
      completed: { type: Boolean, default: true },
      failed: { type: Boolean, default: true },
      disconnected: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const User: Model<UserDocument> = mongoose.model<UserDocument>(
  "User",
  userSchema,
);
