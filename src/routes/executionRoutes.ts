import { Router } from "express";
import {
  getExecution,
  getExecutionResults,
} from "../controllers/executionController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const executionRouter = Router();
executionRouter.use(requireAuth);
executionRouter.get("/:executionId/results", asyncHandler(getExecutionResults));
executionRouter.get("/:executionId", asyncHandler(getExecution));

export default executionRouter;
