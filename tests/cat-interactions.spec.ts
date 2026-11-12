import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("cat interactions start enabled without a separate animation switch", async ({ page }) => {
  await expect(page.getByTestId("cats")).toHaveAttribute("data-motion", "on");
  await expect(page.getByRole("checkbox", { name: "互动动画", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("cat-portrait")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "摸摸小橘", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "摸摸小灰", exact: true })).toBeVisible();
});

test("cats gently turn toward the pointer without moving the login card", async ({ page }) => {
  const portraits = page.getByTestId("cat-portrait");
  const card = page.getByTestId("login-card");
  await expect(page.getByTestId("cats")).toHaveAttribute("data-motion", "on");
  const initialCard = await card.boundingBox();
  await page.mouse.move(2, 2);
  await expect.poll(async () => portraits.first().evaluate((portrait) =>
    new DOMMatrixReadOnly(getComputedStyle(portrait).transform).m41,
  )).toBeLessThan(0);
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width - 2, viewport.height - 2);
  await expect.poll(async () => portraits.first().evaluate((portrait) =>
    new DOMMatrixReadOnly(getComputedStyle(portrait).transform).m41,
  )).toBeGreaterThan(0);
  const poses = await portraits.evaluateAll((elements) => elements.map((portrait) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(portrait).transform);
    return { x: matrix.m41, y: matrix.m42, angle: Math.atan2(matrix.m12, matrix.m11) * 180 / Math.PI };
  }));
  for (const { x, y, angle } of poses) {
    expect(Math.abs(x)).toBeLessThanOrEqual(.81);
    expect(Math.abs(y)).toBeLessThanOrEqual(.81);
    expect(Math.abs(angle)).toBeLessThanOrEqual(.81);
  }
  expect(await card.boundingBox()).toEqual(initialCard);
});

test("petting either cat changes only that cat and returns to its resting face", async ({ page }) => {
  await page.clock.install();
  const left = page.getByTestId("cat-left");
  const right = page.getByTestId("cat-right");
  await page.getByRole("button", { name: "摸摸小橘", exact: true }).click();
  await expect(left).toHaveAttribute("data-expression", "content");
  await expect(right).toHaveAttribute("data-expression", "normal");
  await expect(page.getByText("小橘：呼噜呼噜，喜欢你。", { exact: true })).toBeInViewport({ ratio: 1 });
  await page.clock.fastForward(2300);
  await expect(left).toHaveAttribute("data-expression", "normal");
  await page.getByRole("button", { name: "摸摸小灰", exact: true }).click();
  await expect(left).toHaveAttribute("data-expression", "normal");
  await expect(right).toHaveAttribute("data-expression", "content");
  await expect(page.getByText("小灰：今天也要贴贴。", { exact: true })).toBeVisible();
  await page.clock.fastForward(2300);
  await expect(right).toHaveAttribute("data-expression", "normal");
});

test("a repeated pet restarts the response instead of being cleared by an older timer", async ({ page }) => {
  await page.clock.install();
  const left = page.getByTestId("cat-left");
  const pet = page.getByRole("button", { name: "摸摸小橘", exact: true });
  await pet.click();
  await expect(left).toHaveAttribute("data-expression", "content");
  await page.clock.fastForward(1500);
  await pet.click();
  await page.clock.fastForward(1000);
  await expect(left).toHaveAttribute("data-expression", "content");
  await page.clock.fastForward(1300);
  await expect(left).toHaveAttribute("data-expression", "normal");
});

test("keyboard users can pet both cats without submitting or changing the form", async ({ page }) => {
  const account = page.getByLabel(/^账号(?:\s|$)/);
  const password = page.getByLabel(/^密码(?:\s|$)/);
  await account.fill("fictional-cat-friend");
  await password.fill("fictional-demo-password");
  const leftButton = page.getByRole("button", { name: "摸摸小橘", exact: true });
  await expect(leftButton).toBeEnabled();
  await leftButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "content");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "摸摸小灰", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("cat-right")).toHaveAttribute("data-expression", "content");
  await expect(account).toHaveValue("fictional-cat-friend");
  await expect(password).toHaveValue("fictional-demo-password");
  await expect(page.getByText(/演示完成/)).toHaveCount(0);
  await expect(page.getByText("请输入账号", { exact: true })).toHaveCount(0);
});

test("mouse petting preserves password focus and keeps both cats covering their eyes", async ({ page }) => {
  await page.clock.install();
  const password = page.getByLabel(/^密码(?:\s|$)/);
  await password.fill("fictional-kept-private");
  await page.getByRole("button", { name: "摸摸小橘", exact: true }).click();
  await expect(password).toBeFocused();
  await expect(password).toHaveValue("fictional-kept-private");
  await expect(page.getByTestId("cats")).toHaveAttribute("data-state", "covering");
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "covering");
  await expect(page.getByTestId("cat-right")).toHaveAttribute("data-expression", "covering");
  await expect(page.getByText("嘘，我们不偷看。", { exact: true })).toBeVisible();
  await page.clock.fastForward(2300);
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "covering");
  await page.getByLabel(/^账号(?:\s|$)/).focus();
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "normal");
  await expect(page.getByTestId("cat-right")).toHaveAttribute("data-expression", "normal");
});

test("system reduced motion keeps petting usable and responds to live preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const cats = page.getByTestId("cats");
  const portraits = page.getByTestId("cat-portrait");
  await expect(cats).toHaveAttribute("data-motion", "off");
  await page.getByRole("button", { name: "摸摸小橘", exact: true }).click();
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "content");
  await expect(page.getByText("小橘：呼噜呼噜，喜欢你。", { exact: true })).toBeVisible();
  expect(await cats.evaluate((element) =>
    element.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"),
  )).toBe(false);
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "normal");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(cats).toHaveAttribute("data-motion", "on");
  await page.mouse.move(2, 2);
  await expect.poll(async () => portraits.first().evaluate((portrait) =>
    new DOMMatrixReadOnly(getComputedStyle(portrait).transform).m41,
  )).toBeLessThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cats).toHaveAttribute("data-motion", "off");
  await page.mouse.move(900, 650);
  await expect.poll(async () => portraits.evaluateAll((elements) => elements.every((portrait) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(portrait).transform);
    return Math.abs(matrix.m41) < .01 && Math.abs(matrix.m42) < .01 && Math.abs(matrix.m12) < .001;
  }))).toBe(true);
  await page.getByLabel(/^密码(?:\s|$)/).fill("fictional-still-editable");
  await expect(cats).toHaveAttribute("data-state", "covering");
  await expect(page.getByLabel(/^密码(?:\s|$)/)).toHaveValue("fictional-still-editable");
});
