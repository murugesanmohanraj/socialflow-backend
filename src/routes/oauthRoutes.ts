import { Router } from "express";
import {
  startYouTubeOAuth,
  youtubeOAuthCallback,
} from "../controllers/youtubeOAuthController";
import { requireAuth } from "../middleware/authMiddleware";

const oauthRouter = Router();
oauthRouter.get("/youtube/start", requireAuth, startYouTubeOAuth);
oauthRouter.get("/youtube/callback", youtubeOAuthCallback);

export default oauthRouter;
