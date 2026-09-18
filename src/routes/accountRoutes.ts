import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  connectFacebookAccount,
  connectInstagramAccount,
  connectTikTokAccount,
  disconnectAccount,
  getAccount,
  listAccounts,
} from "../controllers/accountController";
import { requireAuth } from "../middleware/authMiddleware";

const accountRouter = Router();

accountRouter.use(requireAuth);
accountRouter.get("/", asyncHandler(listAccounts));
accountRouter.post("/facebook", asyncHandler(connectFacebookAccount));
accountRouter.post("/tiktok", asyncHandler(connectTikTokAccount));
accountRouter.post("/instagram", asyncHandler(connectInstagramAccount));
accountRouter.get("/:accountId", asyncHandler(getAccount));
accountRouter.delete("/:accountId", asyncHandler(disconnectAccount));

export default accountRouter;
