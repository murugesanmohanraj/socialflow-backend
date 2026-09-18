import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { runTikTokBrowserAction } from "../controllers/tiktokBrowserController";

const tiktokBrowserRouter = Router();

tiktokBrowserRouter.use(requireAuth);
tiktokBrowserRouter.post("/run", asyncHandler(runTikTokBrowserAction));

export default tiktokBrowserRouter;
