import path from "path";
import { BrowserContext, Page, chromium } from "playwright";
import { env } from "../config/env";

function isTikTokUrl(value: string) {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    (url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com"))
  );
}

function extractVideoIdFromUrl(targetUrl: string): string | null {
  try {
    const url = new URL(targetUrl);
    const match = url.pathname.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function waitForNavigation(page: Page, timeoutMs = 30000) {
  await page
    .waitForLoadState("domcontentloaded", { timeout: timeoutMs })
    .catch(() => undefined);
  await page
    .waitForLoadState("networkidle", { timeout: timeoutMs })
    .catch(() => undefined);
}

async function handleCaptchaOrChallenge(page: Page): Promise<boolean> {
  const captchaSelectors = [
    'div[class*="captcha"]',
    'div[class*="verify"]',
    'iframe[src*="captcha"]',
    'div[data-testid="captcha"]',
    'div[role="dialog"]:has-text("Verify")',
    'div[role="dialog"]:has-text("Security")',
  ];

  for (const selector of captchaSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("CAPTCHA/Challenge detected:", selector);
      return true;
    }
  }
  return false;
}

async function randomDelay(minMs: number, maxMs: number) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function humanLikeMouseMove(
  page: Page,
  target: { x: number; y: number },
) {
  const start = await page.evaluate(() => ({ x: 0, y: 0 }));
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x =
      start.x + (target.x - start.x) * (i / steps) + (Math.random() - 0.5) * 10;
    const y =
      start.y + (target.y - start.y) * (i / steps) + (Math.random() - 0.5) * 10;
    await page.mouse.move(x, y);
    await randomDelay(10, 30);
  }
}

async function loginToTikTok(page: Page, email: string, password: string) {
  const emailSelectors = [
    'input[name="username"]',
    'input[placeholder*="Phone" i]',
    'input[placeholder*="Email" i]',
    'input[placeholder*="Username" i]',
    'input[type="text"][autocomplete="username"]',
  ];

  const passwordSelectors = [
    'input[name="password"]',
    'input[placeholder*="Password" i]',
    'input[type="password"]',
  ];

  const submitSelectors = [
    'button:has-text("Log in")',
    'button[type="submit"]',
    'button[data-e2e="login-button"]',
    'div[role="button"]:has-text("Log in")',
  ];

  let emailField = page.locator(emailSelectors.join(",")).first();
  let passwordField = page.locator(passwordSelectors.join(",")).first();
  let submitButton = page.locator(submitSelectors.join(",")).first();

  for (let attempt = 1; attempt <= 3; attempt++) {
    await emailField
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);
    await passwordField
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);

    if (!(await emailField.isVisible().catch(() => false))) {
      if (attempt === 3) return false;
      await randomDelay(1500, 2500);
      continue;
    }

    await emailField.fill(email, { timeout: 10000 });
    await randomDelay(300, 800);
    await passwordField.fill(password, { timeout: 10000 });
    await randomDelay(300, 800);

    try {
      await submitButton.click({ timeout: 15000, force: true });
    } catch {
      try {
        await passwordField.press("Enter");
      } catch {
        // fallback
      }
    }

    await waitForNavigation(page);
    await randomDelay(3000, 5000);

    const stillOnLogin =
      page.url().includes("login") || page.url().includes("auth");
    if (!stillOnLogin) {
      console.log("TikTok login success confirmed.");
      return true;
    }

    if (await handleCaptchaOrChallenge(page)) {
      console.log(
        "CAPTCHA detected during login, waiting for manual resolution...",
      );
      await randomDelay(30000, 60000);
      const stillOnLoginAfterCaptcha =
        page.url().includes("login") || page.url().includes("auth");
      if (!stillOnLoginAfterCaptcha) return true;
    }

    if (attempt < 3) {
      await randomDelay(2000, 4000);
    }
  }

  return false;
}

async function ensureLoggedIn(
  page: Page,
  email?: string,
  password?: string,
): Promise<boolean> {
  const profileSelectors = [
    'div[data-e2e="profile-icon"]',
    'a[href*="/@"]',
    'div[class*="avatar"]',
    'button[aria-label*="Profile"]',
  ];

  for (const selector of profileSelectors) {
    if (
      await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      console.log("Already logged in to TikTok");
      return true;
    }
  }

  if (email && password) {
    return await loginToTikTok(page, email, password);
  }

  return false;
}

async function likeVideo(page: Page): Promise<boolean> {
  const likeSelectors = [
    'button[data-e2e="like-icon"]',
    'button[aria-label*="Like"]',
    'div[data-e2e="like"] button',
    'span[data-e2e="like-icon"]',
    'i[data-e2e="like-icon"]',
  ];

  for (const selector of likeSelectors) {
    const likeButton = page.locator(selector).first();
    if (await likeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isLiked = await likeButton
        .getAttribute("aria-pressed")
        .catch(() => "false");
      if (isLiked === "true") {
        console.log("Video already liked");
        return true;
      }

      const box = await likeButton.boundingBox().catch(() => null);
      if (box) {
        await humanLikeMouseMove(page, {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        });
      }
      await randomDelay(200, 500);
      await likeButton.click({ force: true });
      await randomDelay(1000, 2000);
      console.log("Video liked successfully");
      return true;
    }
  }

  console.log("Like button not found");
  return false;
}

async function commentOnVideo(
  page: Page,
  commentText: string,
): Promise<boolean> {
  const commentInputSelectors = [
    'div[data-e2e="comment-input"]',
    'div[contenteditable="true"][placeholder*="Comment" i]',
    'div[contenteditable="true"][placeholder*="Add comment" i]',
    'div[class*="comment-input"]',
    'textarea[placeholder*="Comment" i]',
  ];

  const postButtonSelectors = [
    'button[data-e2e="comment-post"]',
    'button:has-text("Post")',
    'button:has-text("Comment")',
    'div[role="button"]:has-text("Post")',
  ];

  let commentInput = null;
  for (const selector of commentInputSelectors) {
    const input = page.locator(selector).first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      commentInput = input;
      break;
    }
  }

  if (!commentInput) {
    console.log("Comment input not found");
    return false;
  }

  const box = await commentInput.boundingBox().catch(() => null);
  if (box) {
    await humanLikeMouseMove(page, {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    });
  }
  await randomDelay(300, 800);

  await commentInput.click({ force: true });
  await randomDelay(300, 800);
  await commentInput.fill(commentText);
  await randomDelay(500, 1500);

  let postButton = null;
  for (const selector of postButtonSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      postButton = button;
      break;
    }
  }

  if (!postButton) {
    console.log("Post button not found");
    return false;
  }

  const postBox = await postButton.boundingBox().catch(() => null);
  if (postBox) {
    await humanLikeMouseMove(page, {
      x: postBox.x + postBox.width / 2,
      y: postBox.y + postBox.height / 2,
    });
  }
  await randomDelay(300, 800);
  await postButton.click({ force: true });
  await randomDelay(2000, 4000);

  console.log("Comment posted successfully");
  return true;
}

async function watchVideo(
  page: Page,
  minSeconds: number = 10,
): Promise<boolean> {
  const videoSelectors = [
    'video[data-e2e="video-player"]',
    'video[class*="video"]',
    'div[data-e2e="video-player"] video',
    "video",
  ];

  let videoElement = null;
  for (const selector of videoSelectors) {
    const video = page.locator(selector).first();
    if (await video.isVisible({ timeout: 5000 }).catch(() => false)) {
      videoElement = video;
      break;
    }
  }

  if (!videoElement) {
    console.log("Video element not found");
    return false;
  }

  const duration = await videoElement
    .evaluate((el: HTMLVideoElement) => el.duration || 0)
    .catch(() => 0);
  const watchTime =
    duration > 0
      ? Math.min(duration * 1000, minSeconds * 1000)
      : minSeconds * 1000;

  try {
    await videoElement
      .evaluate((el: HTMLVideoElement) => el.play())
      .catch(() => undefined);
  } catch {
    // ignore play errors
  }

  console.log(`Watching video for ${Math.round(watchTime / 1000)} seconds...`);
  await randomDelay(watchTime, watchTime + 3000);

  try {
    await videoElement
      .evaluate((el: HTMLVideoElement) => el.pause())
      .catch(() => undefined);
  } catch {
    // ignore pause errors
  }

  return true;
}

export async function runTikTokAction(
  userId: string,
  accountId: string,
  targetUrl: string,
  actionType: "like" | "comment" | "like_comment" | "watch",
  commentText?: string,
  email?: string,
  password?: string,
) {
  if (!isTikTokUrl(targetUrl)) {
    throw new Error("Only HTTPS TikTok URLs are allowed");
  }

  const userDataDirectory = path.resolve(
    process.cwd(),
    ".playwright",
    "tiktok",
    userId,
    accountId,
  );

  const context = await chromium.launchPersistentContext(userDataDirectory, {
    headless: env.nodeEnv === "production",
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ...(env.proxyConfig && { proxy: env.proxyConfig }),
  });

  let workflowCompleted = false;
  let page: Page | undefined;

  try {
    page = context.pages()[0];
    if (!page || page.isClosed()) {
      page = await context.newPage();
    }

    await page.bringToFront();
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await randomDelay(3000, 6000);

    if (await handleCaptchaOrChallenge(page)) {
      console.log("CAPTCHA detected on video page, waiting...");
      await randomDelay(30000, 60000);
    }

    const loggedIn = await ensureLoggedIn(page, email, password);
    if (!loggedIn) {
      throw new Error("TikTok login failed. Chromium remains open for review.");
    }

    await randomDelay(2000, 4000);

    let success = false;
    let message = "";
    let clickedLike = false;
    let postedComment = false;

    switch (actionType) {
      case "like":
        clickedLike = await likeVideo(page);
        success = clickedLike;
        message = success
          ? "TikTok video liked successfully"
          : "Failed to like TikTok video";
        break;
      case "comment":
        if (!commentText) throw new Error("Comment text is required");
        postedComment = await commentOnVideo(page, commentText.trim());
        success = postedComment;
        message = success
          ? "Comment posted successfully on TikTok"
          : "Failed to post comment on TikTok";
        break;
      case "like_comment":
        if (!commentText || !commentText.trim()) {
          throw new Error("Comment text is required");
        }
        clickedLike = await likeVideo(page);
        if (!clickedLike) {
          throw new Error("Failed to like TikTok video");
        }
        postedComment = await commentOnVideo(page, commentText.trim());
        success = clickedLike && postedComment;
        message = success
          ? "TikTok video liked and comment posted successfully"
          : "TikTok video liked but comment post failed";
        break;
      case "watch":
        success = await watchVideo(page);
        message = success
          ? "TikTok video watched successfully"
          : "Failed to watch TikTok video";
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    workflowCompleted = success;

    return {
      url: page.url(),
      title: await page.title(),
      success,
      message,
      clickedLike,
      postedComment,
    };
  } finally {
    if (workflowCompleted) {
      await context.close();
    } else {
      console.error("TikTok workflow incomplete; Chromium remains open.");
    }
  }
}
