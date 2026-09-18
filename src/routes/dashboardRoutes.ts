import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { getDashboardSummary } from "../controllers/dashboardController";

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/summary", asyncHandler(getDashboardSummary));

export default dashboardRouter;
