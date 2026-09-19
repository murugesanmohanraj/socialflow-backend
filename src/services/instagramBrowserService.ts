import path from "path";
import { BrowserContext, Page, chromium } from "playwright";
import { env } from "../config/env";

type PendingInstagramVerification = {
  context: BrowserContext;
  page: Page;
  actionType: "like" | "comment" | "like_comment";
  commentText?: string;
};

const pendingVerifications = new Map<string, PendingInstagramVerification>();

function verificationKey(userId: string, accountId: string) {
  return `${userId}:${accountId}`;
}

function isInstagramUrl(value: string) {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    (url.hostname === "instagram.com" ||
      url.hostname.endsWith(".instagram.com"))
  );
}

async function isInstagramLoginState(page: Page) {
  const loginAnchorVisible = await page
    .locator('a:has-text("Log In")')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);

  console.log(
    '[Instagram] Login check: a:has-text("Log In") visible =',
    loginAnchorVisible,
    "URL:",
    page.url(),
  );

  // true = not logged in
  // false = logged in
  return loginAnchorVisible;
}

async function waitForInstagramLoginForm(page: Page) {
  const selectors = [
    'input[name="username"], input[name="email"], input[autocomplete="username"]',
    'input[type="password"], input[name="password"], input[autocomplete="current-password"]',
  ];

  for (const selector of selectors) {
    const visible = await page
      .locator(selector)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (visible) {
      console.log("[Instagram] Login form detected with selector:", selector);
      return true;
    }
  }

  const urlLooksLikeLoginPage =
    page.url().includes("/accounts/login") || page.url().includes("/login");
  const loginInputVisible = await page
    .locator(
      'input[name="username"], input[name="email"], input[autocomplete="username"], input[type="password"], input[name="password"], input[autocomplete="current-password"]',
    )
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  console.log(
    "[Instagram] Login form wait result: URL login page =",
    urlLooksLikeLoginPage,
    "Inputs visible =",
    loginInputVisible,
    "Current URL =",
    page.url(),
  );
  return urlLooksLikeLoginPage && loginInputVisible;
}

async function randomDelay(minMs: number, maxMs: number) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function clickInstagramLoginButton(page: Page) {
  const loginButton = page.locator('a:has-text("Log In")').first();

  const beforeClick = await loginButton
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  console.log(
    "[Instagram] Log In button visible before click:",
    beforeClick,
    "URL:",
    page.url(),
  );

  if (!beforeClick) {
    console.log("[Instagram] Log In button not found. Click skipped.");
    return false;
  }

  try {
    await loginButton.click({ force: true, timeout: 10_000 });
    console.log("[Instagram] Log In button clicked successfully.");

    await page.waitForTimeout(2000);

    const afterClickVisible = await loginButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    console.log(
      "[Instagram] Log In button visible after 2 sec:",
      afterClickVisible,
      "URL:",
      page.url(),
    );

    if (afterClickVisible) {
      try {
        await loginButton.click({ force: true, timeout: 10_000 });
        console.log("[Instagram] Second Log In click succeeded.");

        await page.waitForTimeout(2000);

        const exactLogInSpanVisible = await page
          .locator("span")
          .filter({ hasText: /^Log in$/ })
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        console.log(
          "[Instagram] Exact span contains only 'Log in' visible after 2 sec of second click:",
          exactLogInSpanVisible,
          "URL:",
          page.url(),
        );

        if (!exactLogInSpanVisible) {
          const useAnotherProfile = page
            .locator("span")
            .filter({ hasText: /^Use another profile$/ })
            .first();

          const useAnotherProfileVisible = await useAnotherProfile
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          console.log(
            "[Instagram] Exact span contains only 'Use another profile' visible after second click:",
            useAnotherProfileVisible,
            "URL:",
            page.url(),
          );

          if (useAnotherProfileVisible) {
            try {
              await useAnotherProfile.click({ force: true, timeout: 10_000 });
              console.log(
                "[Instagram] 'Use another profile' span click succeeded.",
              );
            } catch {
              console.log(
                "[Instagram] 'Use another profile' span click failed.",
              );
            }
          }
        }

        return true;
      } catch {
        console.log("[Instagram] Second Log In click failed.");
        return false;
      }
    }

    return true;
  } catch {
    console.log("[Instagram] Log In button click failed.");
    return false;
  }
}

async function ensureLoggedIn(page: Page, email?: string, password?: string) {
  if (!email || !password) {
    console.log(
      "[Instagram] Email or password missing. Cannot fill Instagram login form.",
    );
    return false;
  }

  const emailSelector =
    'input[name="username"], input[name="email"], input[autocomplete="username"]';
  const passwordSelector =
    'input[type="password"], input[name="password"], input[autocomplete="current-password"]';

  const emailField = page.locator(emailSelector).first();
  const passwordField = page.locator(passwordSelector).first();

  const emailVisible = await emailField
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  const passwordVisible = await passwordField
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log("[Instagram] Login form fields visible:", {
    emailVisible,
    passwordVisible,
    url: page.url(),
  });

  if (!emailVisible || !passwordVisible) {
    console.log("[Instagram] Login form fields not visible yet.");
    return false;
  }

  await page.waitForTimeout(1000);

  await emailField.fill(email, { timeout: 10_000 });
  await passwordField.fill(password, { timeout: 10_000 });

  console.log("[Instagram] Email and password filled successfully.");

  const loginSubmitSpan = page
    .locator("span")
    .filter({ hasText: /^Log in$/ })
    .first();

  const loginSubmitSpanVisible = await loginSubmitSpan
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log(
    "[Instagram] Exact Log in span visible after fill:",
    loginSubmitSpanVisible,
    "URL:",
    page.url(),
  );

  if (loginSubmitSpanVisible) {
    try {
      await loginSubmitSpan.click({ force: true, timeout: 10_000 });
      console.log("[Instagram] Exact Log in span clicked successfully.");

      console.log(
        "[Instagram] Waiting 3 seconds before checking for Save info.",
      );
      await page.waitForTimeout(3000);

      const saveInfoButton = page
        .locator("button")
        .filter({ hasText: /^Save info$/ })
        .first();

      const saveInfoVisible = await saveInfoButton
        .isVisible({ timeout: 15000 })
        .catch(() => false);

      console.log(
        "[Instagram] Exact Save info button visible after login:",
        saveInfoVisible,
        "URL:",
        page.url(),
      );

      if (saveInfoVisible) {
        try {
          await saveInfoButton.click({ force: true, timeout: 10_000 });
          console.log(
            "[Instagram] Exact Save info button clicked successfully.",
          );
          console.log(
            "[Instagram] Waiting 2 seconds after Save info click before action...",
          );
          await page.waitForTimeout(2000);
        } catch {
          console.log("[Instagram] Exact Save info button click failed.");
        }
      } else {
        console.log(
          "[Instagram] Save info not visible. Waiting 20 seconds before checking verification.",
        );
        await page.waitForTimeout(20000);

        const verificationRequired = await inspectInstagramVerification(page);
        if (verificationRequired) {
          return "verification_required";
        }
      }
    } catch {
      console.log("[Instagram] Exact Log in span click failed.");
    }
  }

  return true;
}

async function inspectInstagramVerification(page: Page) {
  const codeInput = page
    .locator("div")
    .filter({
      has: page.locator("label").filter({ hasText: /^Code$/ }),
    })
    .locator("input")
    .first();
  const codeInputVisible = await codeInput
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  console.log("[Instagram] Verification Code input visible:", codeInputVisible);

  if (!codeInputVisible) {
    return false;
  }

  console.log(
    "[Instagram] Code input is visible. Waiting 10 seconds before checking for Get a new code.",
  );
  await page.waitForTimeout(10_000);

  const newCodeElement = page.locator('div[role="button"]', {
    hasText: "Get a new code",
  });
  const newCodeCount = await newCodeElement.count();

  if (newCodeCount) {
    const newCodeHtml = await newCodeElement.evaluate(
      (element) => element.outerHTML,
    );
    console.log("[Instagram] Get a new code element HTML:", newCodeHtml);
  }

  return newCodeCount > 0 && codeInputVisible;
}

async function clickLikeButton(
  page: Page,
): Promise<"liked" | "already_liked" | false> {
  console.log("[Instagram] Searching for the Like element.");

  const likeButton = page
    .locator('div[data-visualcompletion="ignore-dynamic"] div[role="button"]')
    .filter({
      has: page.locator('svg[aria-label="Like"]'),
    });
  const unlikeButton = page
    .locator('div[data-visualcompletion="ignore-dynamic"] div[role="button"]')
    .filter({
      has: page.locator('svg[aria-label="Unlike"]'),
    });
  const likeElementCount = await likeButton.count();
  const unLikeElementCount = await unlikeButton.count();

  console.log("[Instagram] Like element counts:", {
    likeElementCount,
    unLikeElementCount,
  });

  if (!likeElementCount) {
    if (unLikeElementCount) {
      console.log(
        "[Instagram] Unlike element found. Instagram post is already liked.",
      );
      return "already_liked";
    }

    console.log("[Instagram] Like or Unlike element was not found.");
    return false;
  }

  const firstLikeElement = likeButton.first();

  const visible = await firstLikeElement
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!visible) {
    console.log("[Instagram] Like element is not visible.");
    return false;
  }

  try {
    await firstLikeElement.click({ force: true, timeout: 10_000 });
    console.log("[Instagram] Like button clicked successfully.");
    return "liked";
  } catch (error) {
    console.log("[Instagram] Like button click failed:", error);
    return false;
  }
}

async function commentOnPost(page: Page, commentText: string) {
  console.log("[Instagram] Starting comment action with text:", commentText);

  const commentButtonSelectors = [
    'button[aria-label="Comment"]',
    'button[aria-label*="Comment" i]',
    'svg[aria-label="Comment"]',
    'svg[aria-label*="Comment" i]',
    '[aria-label*="Comment" i]',
  ];

  let foundVisibleCommentButton = false;
  for (const selector of commentButtonSelectors) {
    const button = page.locator(selector).first();
    const visible = await button
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    console.log("[Instagram] Comment button visible check:", {
      selector,
      visible,
    });
    if (visible) {
      foundVisibleCommentButton = true;
      console.log(
        "[Instagram] Clicking comment control with selector:",
        selector,
      );
      await button
        .click({ force: true, timeout: 10_000 })
        .catch(() => undefined);
      break;
    }
  }

  const fieldSelectors = [
    'textarea[placeholder*="Add a comment" i]',
    'textarea[aria-label*="Add a comment" i]',
    'div[role="textbox"][aria-label*="Add a comment" i]',
    'div[contenteditable="true"][aria-label*="Add a comment" i]',
    'div[role="textbox"][placeholder*="comment" i]',
    "textarea",
    'div[contenteditable="true"]',
  ];

  let foundVisibleCommentField = false;
  for (const selector of fieldSelectors) {
    const field = page.locator(selector).first();
    const visible = await field.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("[Instagram] Comment field visible check:", {
      selector,
      visible,
    });
    if (visible) {
      foundVisibleCommentField = true;
      console.log("[Instagram] Typing comment into selector:", selector);
      await field.click({ force: true });
      await field.fill(commentText, { timeout: 10_000 });

      console.log(
        "[Instagram] Waiting 1 second before clicking the final Post div.",
      );
      await page.waitForTimeout(1000);

      const finalPostButton = page
        .locator('div[role="button"]')
        .filter({ hasText: "Post" })
        .last();

      const finalPostVisible = await finalPostButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      console.log("[Instagram] Final Post div visible:", finalPostVisible);

      if (finalPostVisible) {
        const finalPostHtml = await finalPostButton.evaluate(
          (el) => el.outerHTML,
        );
        console.log("[Instagram] Final Post div HTML:", finalPostHtml);
        await finalPostButton.click({ force: true, timeout: 10_000 });
        console.log("[Instagram] Final Post div clicked successfully.");
      }

      await randomDelay(2000, 4000);
      console.log("[Instagram] Comment action finished.", {
        foundVisibleCommentButton,
        foundVisibleCommentField,
      });
      return true;
    }
  }

  console.log("[Instagram] Comment field not found or not visible.", {
    foundVisibleCommentButton,
    foundVisibleCommentField,
  });
  return false;
}

async function performInstagramAction(
  page: Page,
  actionType: "like" | "comment" | "like_comment",
  commentText?: string,
) {
  let message = "";
  let clickedLike = false;
  let postedComment = false;

  if (actionType === "like" || actionType === "like_comment") {
    const likeResult = await clickLikeButton(page);
    if (!likeResult) {
      throw new Error("Failed to like Instagram post");
    }
    clickedLike = true;
    message =
      likeResult === "already_liked"
        ? "Instagram post was already liked"
        : "Instagram post liked successfully";
  }

  if (actionType === "comment" || actionType === "like_comment") {
    if (!commentText || !commentText.trim()) {
      throw new Error("Comment text is required");
    }
    postedComment = await commentOnPost(page, commentText.trim());
    if (!postedComment) {
      throw new Error("Failed to post comment on Instagram");
    }
    message = message
      ? `${message}; comment posted successfully`
      : "Comment posted successfully on Instagram";
  }

  return {
    url: page.url(),
    title: await page.title(),
    success: true,
    message,
    clickedLike,
    postedComment,
  };
}

export async function runInstagramAction(
  userId: string,
  accountId: string,
  targetUrl: string,
  actionType: "like" | "comment" | "like_comment",
  commentText?: string,
  email?: string,
  password?: string,
) {
  console.log("[Instagram] Starting runInstagramAction.");
  console.log("[Instagram] Params:", {
    userId,
    accountId,
    targetUrl,
    actionType,
    commentText,
  });

  if (!isInstagramUrl(targetUrl)) {
    console.log("[Instagram] Invalid URL passed.");
    throw new Error("Only HTTPS Instagram URLs are allowed");
  }

  const userDataDirectory = path.resolve(
    process.cwd(),
    ".playwright",
    "instagram",
    userId,
    accountId,
  );

  console.log("[Instagram] User data directory:", userDataDirectory);

  const context: BrowserContext = await chromium.launchPersistentContext(
    userDataDirectory,
    {
      headless: env.nodeEnv === "production",
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...(env.proxyConfig && { proxy: env.proxyConfig }),
    },
  );

  let workflowCompleted = false;
  let page: Page | undefined;

  try {
    page = context.pages()[0];
    if (!page || page.isClosed()) {
      console.log("[Instagram] Creating new page.");
      page = await context.newPage();
    }

    await page.bringToFront();
    console.log("[Instagram] Navigating to target URL.");
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await randomDelay(3000, 6000);

    const loginStatus = await isInstagramLoginState(page);
    console.log(
      "[Instagram] Login status check result:",
      loginStatus,
      "URL:",
      page.url(),
    );

    if (loginStatus) {
      const clickedLogin = await clickInstagramLoginButton(page);
      console.log(
        "[Instagram] Login button click result:",
        clickedLogin,
        "URL:",
        page.url(),
      );

      if (!clickedLogin) {
        throw new Error("Instagram login flow could not be started.");
      }

      const filledCredentials = await ensureLoggedIn(page, email, password);

      if (!filledCredentials) {
        throw new Error(
          "Instagram login failed. Chromium remains open for review.",
        );
      }

      if (filledCredentials === "verification_required") {
        pendingVerifications.set(verificationKey(userId, accountId), {
          context,
          page,
          actionType,
          commentText,
        });
        return {
          url: page.url(),
          title: await page.title(),
          success: false,
          message: "Instagram verification code is required",
          verificationRequired: true,
          clickedLike: false,
          postedComment: false,
        };
      }
    }

    await randomDelay(2000, 4000);

    const result = await performInstagramAction(page, actionType, commentText);
    workflowCompleted = result.success;
    await randomDelay(1000, 2000);
    return result;
  } finally {
    if (workflowCompleted) {
      console.log(
        "[Instagram] Workflow completed; closing Chromium after the action.",
      );
      await context.close().catch((error) => {
        console.log("[Instagram] Chromium close failed:", error);
      });
    } else {
      console.log(
        "[Instagram] Workflow incomplete; keeping Chromium open for manual inspection.",
      );
    }
  }
}

export async function submitInstagramVerificationCode(
  userId: string,
  accountId: string,
  code: string,
) {
  const pending = pendingVerifications.get(verificationKey(userId, accountId));
  if (!pending) {
    throw new Error("No pending Instagram verification session was found.");
  }

  const codeInput = pending.page
    .locator("div")
    .filter({
      has: pending.page.locator("label").filter({ hasText: /^Code$/ }),
    })
    .locator('input[name="email"], input[type="text"], input')
    .first();

  if (!(await codeInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    throw new Error("Instagram verification Code input is not visible.");
  }

  await codeInput.fill(code);
  console.log("[Instagram] Verification code filled:", code);

  const continueSpan = pending.page
    .locator("span")
    .filter({ hasText: /^Continue$/ })
    .first();
  const continueVisible = await continueSpan
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log("[Instagram] Continue span visible:", continueVisible);

  if (continueVisible) {
    try {
      await continueSpan.click({ force: true, timeout: 10_000 });
      console.log("[Instagram] Continue button clicked successfully.");

      console.log(
        "[Instagram] Waiting 10 seconds after Continue before running the action.",
      );
      await pending.page.waitForTimeout(10_000);

      const result = await performInstagramAction(
        pending.page,
        pending.actionType,
        pending.commentText,
      );
      pendingVerifications.delete(verificationKey(userId, accountId));
      await pending.context.close().catch((error) => {
        console.log("[Instagram] Chromium close failed:", error);
      });

      return result;
    } catch (error) {
      console.log("[Instagram] Continue button click failed:", error);
      throw error;
    }
  } else {
    throw new Error("Instagram Continue button is not visible.");
  }

  throw new Error("Instagram verification could not be completed.");
}

export async function requestInstagramVerificationCode(
  userId: string,
  accountId: string,
) {
  const pending = pendingVerifications.get(verificationKey(userId, accountId));
  if (!pending) {
    throw new Error("No pending Instagram verification session was found.");
  }

  const newCodeButton = pending.page
    .locator('div[role="button"]')
    .filter({ hasText: /^Get a new code$/ })
    .first();
  const visible = await newCodeButton
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log("[Instagram] Get a new code button visible:", visible);

  if (!visible) {
    throw new Error("Instagram Get a new code button is not visible.");
  }

  const html = await newCodeButton.evaluate((element) => element.outerHTML);
  console.log("[Instagram] Get a new code button HTML:", html);

  await newCodeButton.click({ force: true, timeout: 10_000 });
  console.log("[Instagram] Get a new code button clicked successfully.");

  return {
    success: true,
    message: "Instagram requested a new verification code",
  };
}
