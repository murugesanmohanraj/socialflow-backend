import { Router } from "express";
import {
  createAction,
  deleteAction,
  getAction,
  listActions,
  updateAction,
} from "../controllers/actionController";
import { runAction } from "../controllers/executionController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const actionRouter = Router();
actionRouter.use(requireAuth);
actionRouter.post("/", asyncHandler(createAction));
actionRouter.get("/", asyncHandler(listActions));
actionRouter.get("/:actionId", asyncHandler(getAction));
actionRouter.post("/:actionId/run", asyncHandler(runAction));
actionRouter.patch("/:actionId", asyncHandler(updateAction));
actionRouter.delete("/:actionId", asyncHandler(deleteAction));

export default actionRouter;
