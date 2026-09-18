import path from "path";
import { BrowserContext, Page, chromium } from "playwright";
import { env } from "../config/env";

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
        "[Instagram] Waiting 3 more seconds for the next page after login click...",
      );
      await page.waitForTimeout(3000);
      await page
        .waitForLoadState("networkidle", { timeout: 30000 })
        .catch(() => undefined);
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
          "[Instagram] Save info not visible. Skipping wait and calling action directly.",
        );
      }
    } catch {
      console.log("[Instagram] Exact Log in span click failed.");
    }
  }

  return true;
}

async function clickLikeButton(page: Page) {
  console.log("[Instagram] Starting like action.");

  const selectors = [
    'button[aria-label="Like"]',
    'button[aria-label*="Like" i]',
    'button[aria-label="Unlike"]',
    'button[aria-label*="Unlike" i]',
    'svg[aria-label="Like"]',
    'svg[aria-label="Unlike"]',
    '[aria-label*="Like" i]',
  ];

  let foundVisibleLike = false;
  for (const selector of selectors) {
    const button = page.locator(selector).first();
    const visible = await button
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    console.log("[Instagram] Like button visible check:", {
      selector,
      visible,
    });
    if (visible) {
      foundVisibleLike = true;
      console.log("[Instagram] Clicking like control with selector:", selector);
      await button
        .click({ force: true, timeout: 10_000 })
        .catch(() => undefined);
      await randomDelay(1200, 2200);
      return true;
    }
  }

  console.log("[Instagram] Like control not found or not visible.", {
    foundVisibleLike,
  });
  return false;
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
      headless: true,
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
      console.log(
        "[Instagram] Credential fill result:",
        filledCredentials,
        "URL:",
        page.url(),
      );

      if (!filledCredentials) {
        throw new Error(
          "Instagram login failed. Chromium remains open for review.",
        );
      }
    }

    await randomDelay(2000, 4000);

    let success = false;
    let message = "";
    let clickedLike = false;
    let postedComment = false;

    if (actionType === "like" || actionType === "like_comment") {
      clickedLike = await clickLikeButton(page);
      if (!clickedLike) {
        throw new Error("Failed to like Instagram post");
      }
      message = "Instagram post liked successfully";
      success = true;
      await randomDelay(1000, 2000);
    }

    if (actionType === "comment" || actionType === "like_comment") {
      if (!commentText || !commentText.trim()) {
        throw new Error("Comment text is required");
      }
      postedComment = await commentOnPost(page, commentText.trim());
      if (!postedComment) {
        throw new Error("Failed to post comment on Instagram");
      }
      message = success
        ? `${message}; comment posted successfully`
        : "Comment posted successfully on Instagram";
      success = true;
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
      console.log(
        "[Instagram] Closing browser after successful workflow completion.",
      );
      await context.close().catch(() => undefined);
    } else {
      console.log(
        "[Instagram] Workflow incomplete; Chromium remains open for manual inspection.",
      );
    }
  }
}
