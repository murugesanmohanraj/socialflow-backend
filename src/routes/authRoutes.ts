import { Router } from "express";
import {
  currentUser,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", requireAuth, asyncHandler(currentUser));
authRouter.post("/logout", requireAuth, logout);
authRouter.post("/forgot-password", asyncHandler(requestPasswordReset));
authRouter.post("/reset-password", asyncHandler(resetPassword));

export default authRouter;
