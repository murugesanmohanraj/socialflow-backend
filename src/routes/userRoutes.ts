import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  changePassword,
  getProfile,
  getNotifications,
  updateProfile,
  updateNotifications,
} from "../controllers/userController";
import { requireAuth } from "../middleware/authMiddleware";

const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(getProfile));
userRouter.patch("/me", asyncHandler(updateProfile));
userRouter.patch("/me/password", asyncHandler(changePassword));
userRouter.get("/me/notifications", asyncHandler(getNotifications));
userRouter.patch("/me/notifications", asyncHandler(updateNotifications));

export default userRouter;
