import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

export async function getProfile(req: Request, res: Response) {
  const user = await User.findById(req.userId);

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function updateProfile(req: Request, res: Response) {
  const { name } = req.body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({
      success: false,
      message: "Name must contain at least 2 characters",
    });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name: name.trim() },
    { new: true, runValidators: true },
  );

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as Record<string, unknown>;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    res
      .status(400)
      .json({ success: false, message: "Both password fields are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({
      success: false,
      message: "New password must contain at least 8 characters",
    });
    return;
  }

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res
      .status(400)
      .json({ success: false, message: "Current password is incorrect" });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
}

export async function getNotifications(req: Request, res: Response) {
  const user = await User.findById(req.userId);

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.json({ success: true, notifications: user.notifications });
}

export async function updateNotifications(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const keys = ["completed", "failed", "disconnected"] as const;
  const updates: Partial<typeof body> = {};

  for (const key of keys) {
    if (typeof body[key] !== "boolean") {
      res.status(400).json({
        success: false,
        message: `Notification preference '${key}' must be a boolean`,
      });
      return;
    }
    updates[`notifications.${key}`] = body[key];
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.json({ success: true, notifications: user.notifications });
}
