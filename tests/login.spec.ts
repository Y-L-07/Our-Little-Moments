import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows an honest prototype with labelled, autofill-friendly fields", async ({ page }) => {
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "互动动画", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Our Little Moments" })).toBeVisible();
  await expect(page.getByText("把平凡的日子，写成我们的故事。", { exact: true })).toBeVisible();
  await expect(page.getByText(/请勿输入真实账号和密码/)).toBeVisible();
  await expect(page.getByLabel(/^账号(?:\s|$)/)).toHaveAttribute("autocomplete", "username");
  await expect(page.getByLabel(/^密码(?:\s|$)/)).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByLabel(/^账号(?:\s|$)/)).toHaveAttribute("required", "");
  await expect(page.getByLabel(/^密码(?:\s|$)/)).toHaveAttribute("type", "password");
  await expect(page.getByTestId("cats")).toHaveAttribute("data-state", "idle");
});

test("required errors identify fields and focus the first missing value", async ({ page }) => {
  const account = page.getByLabel(/^账号(?:\s|$)/);
  const password = page.getByLabel(/^密码(?:\s|$)/);
  await page.getByRole("button", { name: "进入我们的小屋" }).click();
  await expect(page.getByText("请输入账号", { exact: true })).toBeVisible();
  await expect(page.getByText("请输入密码", { exact: true })).toBeVisible();
  await expect(account).toBeFocused();
  await expect(account).toHaveAttribute("aria-invalid", "true");
  await account.fill("小橘示例");
  await page.getByRole("button", { name: "进入我们的小屋" }).click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("请输入账号", { exact: true })).toHaveCount(0);
});

test("keyboard users can reach fields and toggle visibility without blocking paste", async ({ page }) => {
  const account = page.getByLabel(/^账号(?:\s|$)/);
  const password = page.getByLabel(/^密码(?:\s|$)/);
  await expect(account).toBeEnabled();
  await account.focus();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  expect(await password.evaluate((input) => {
    const candidates = [input, input.parentElement].filter(Boolean) as Element[];
    return candidates.some((element) => {
      const css = getComputedStyle(element);
      return (css.outlineStyle !== "none" && parseFloat(css.outlineWidth) > 0)
        || css.boxShadow !== "none";
    });
  })).toBe(true);
  expect(await password.evaluate((input) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    return input.dispatchEvent(event);
  })).toBe(true);
  await password.fill("demo-only-password");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "显示密码", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("demo-only-password");
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "password");
  await expect(page.getByText("请输入账号", { exact: true })).toHaveCount(0);
});

test("cats cover their eyes for password focus and recover on blur", async ({ page }) => {
  const cats = page.getByTestId("cats");
  const account = page.getByLabel(/^账号(?:\s|$)/);
  const password = page.getByLabel(/^密码(?:\s|$)/);
  await expect(account).toBeEnabled();
  await account.focus();
  await expect(cats).toHaveAttribute("data-state", "watching");
  await password.focus();
  await password.fill("fictional-secret");
  await expect(cats).toHaveAttribute("data-state", "covering");
  await page.getByRole("button", { name: "显示密码", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(cats).not.toHaveAttribute("data-state", "covering");
  await password.focus();
  await expect(cats).toHaveAttribute("data-state", "covering");
  await account.focus();
  await expect(cats).toHaveAttribute("data-state", "watching");
  await account.fill("fictional-account");
  await password.fill("fictional-secret");
  await password.press("Enter");
  await expect(page.getByText(/演示完成/)).toBeVisible();
  await expect(account).toBeEmpty();
  await expect(password).toBeEmpty();
  await expect(password).toBeFocused();
  await expect(cats).toHaveAttribute("data-state", "covering");
  await password.fill("another-fictional-secret");
  await expect(cats).toHaveAttribute("data-state", "covering");
});

test("demo and recovery report honestly without sending or persisting credentials", async ({ page, context }) => {
  const accountValue = "fictional-account-92731";
  const passwordValue = "fictional-password-92731";
  const credentialRequests: string[] = [];
  page.on("request", (request) => {
    const payload = `${request.url()} ${request.postData() ?? ""}`;
    if ([accountValue, passwordValue].some((value) => payload.includes(value))) {
      credentialRequests.push(payload);
    }
  });
  const initialURL = page.url();
  const initialCookies = await context.cookies();
  await page.getByRole("button", { name: "忘记密码？", exact: true }).click();
  await expect(page.getByText(/功能尚未接入/)).toBeVisible();
  await page.getByLabel(/^账号(?:\s|$)/).fill(accountValue);
  await page.getByLabel(/^密码(?:\s|$)/).fill(passwordValue);
  await page.getByRole("button", { name: "进入我们的小屋" }).click();
  await expect(page.getByText(/演示完成/)).toBeVisible();
  await expect(page.getByText(/未进行真实登录/)).toBeVisible();
  expect(page.url()).toBe(initialURL);
  expect(await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }))).toEqual({ local: {}, session: {} });
  expect(await context.cookies()).toEqual(initialCookies);
  await page.reload();
  await expect(page.getByLabel(/^账号(?:\s|$)/)).toBeEmpty();
  await expect(page.getByLabel(/^密码(?:\s|$)/)).toBeEmpty();
  expect(credentialRequests).toEqual([]);
});

test("desktop layouts keep the card and controls usable without horizontal overflow", async ({ page }) => {
  for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByLabel(/^账号(?:\s|$)/)).toBeVisible();
    await expect(page.getByLabel(/^密码(?:\s|$)/)).toBeVisible();
    await expect(page.getByRole("button", { name: "进入我们的小屋" })).toBeInViewport({ ratio: 1 });
    await expect(page.locator("#prototype-notice")).toBeInViewport({ ratio: 1 });
    const card = (await page.getByTestId("login-card").boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps inputs and submission disabled instead of sending a native form", async ({ page }) => {
    await expect(page.getByText("请启用 JavaScript 后体验。表单已停用，不会发送输入内容。", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^账号(?:\s|$)/)).toBeDisabled();
    await expect(page.getByLabel(/^密码(?:\s|$)/)).toBeDisabled();
    const submit = page.getByRole("button", { name: "进入我们的小屋" });
    await expect(submit).toBeDisabled();
    const initialURL = page.url();
    const submissions: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest() || request.method() !== "GET") submissions.push(request.url());
    });
    await submit.click({ force: true });
    await page.keyboard.press("Enter");
    expect(page.url()).toBe(initialURL);
    expect(submissions).toEqual([]);
  });
});
