import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { User } from "../models/User";
import { sendPasswordResetEmail } from "../services/emailService";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId: string) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function userResponse(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as Record<string, unknown>;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({
      success: false,
      message: "Name must contain at least 2 characters",
    });
    return;
  }
  if (!emailPattern.test(normalizedEmail)) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({
      success: false,
      message: "Password must contain at least 6 characters",
    });
    return;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });
  const token = createToken(String(user._id));

  res.status(201).json({ success: true, token, user: userResponse(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as Record<string, unknown>;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash",
  );

  if (
    !user ||
    typeof password !== "string" ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
    return;
  }
  if (!user.isActive) {
    res
      .status(403)
      .json({ success: false, message: "This account is inactive" });
    return;
  }

  res.json({
    success: true,
    token: createToken(String(user._id)),
    user: userResponse(user),
  });
}

export async function currentUser(req: Request, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  res.json({ success: true, user: userResponse(user) });
}

export function logout(_req: Request, res: Response) {
  res.json({ success: true, message: "Logged out successfully" });
}

export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body as Record<string, unknown>;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
    return;
  }

  const response: { success: true; message: string; resetUrl?: string } = {
    success: true,
    message: "If an account exists for this email, a reset link has been sent.",
  };
  const user = await User.findOne({ email: normalizedEmail, isActive: true });

  if (user) {
    await PasswordResetToken.deleteMany({
      userId: user._id,
      usedAt: { $exists: false },
    });
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashResetToken(token),
      expiresAt,
    });

    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    let emailResult: { sent: boolean; id?: string };

    try {
      emailResult = await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      if (env.nodeEnv === "production") {
        throw error;
      }

      console.warn(
        "Password reset email was not sent in development. Use the returned resetUrl:",
        error instanceof Error ? error.message : error,
      );
      emailResult = { sent: false };
    }

    if (!emailResult.sent && env.nodeEnv !== "production") {
      response.resetUrl = resetUrl;
    }
  }

  res.json(response);
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body as Record<string, unknown>;

  if (typeof token !== "string" || token.length < 32) {
    res
      .status(400)
      .json({ success: false, message: "A valid reset token is required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      message: "New password must contain at least 8 characters",
    });
    return;
  }

  const resetRecord = await PasswordResetToken.findOne({
    tokenHash: hashResetToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    res
      .status(400)
      .json({
        success: false,
        message: "The reset token is invalid or expired",
      });
    return;
  }

  const user = await User.findById(resetRecord.userId).select("+passwordHash");
  if (!user || !user.isActive) {
    res
      .status(400)
      .json({
        success: false,
        message: "The reset token is invalid or expired",
      });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  resetRecord.usedAt = new Date();
  await resetRecord.save();

  res.json({ success: true, message: "Password reset successfully" });
}
