import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("desktop gaze follows gently while the login card stays still", async ({ page }) => {
  const card = page.getByTestId("login-card");
  const pupils = page.getByTestId("cat-pupil");
  await expect(pupils).toHaveCount(4);
  await expect(page.getByTestId("cats")).toHaveAttribute("data-motion", "on");
  const before = await card.boundingBox();
  await page.mouse.move(2, 2);
  await expect.poll(async () => pupils.first().evaluate((pupil) =>
    new DOMMatrixReadOnly(getComputedStyle(pupil).transform).m41,
  )).toBeLessThan(0);
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width - 2, viewport.height - 2);
  await expect.poll(async () => pupils.first().evaluate((pupil) =>
    new DOMMatrixReadOnly(getComputedStyle(pupil).transform).m41,
  )).toBeGreaterThan(0);
  const translations = await pupils.evaluateAll((elements) => elements.map((pupil) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(pupil).transform);
    return { x: matrix.m41, y: matrix.m42 };
  }));
  for (const { x, y } of translations) {
    expect(Math.abs(x)).toBeLessThanOrEqual(6);
    expect(Math.abs(y)).toBeLessThanOrEqual(6);
  }
  expect(await card.boundingBox()).toEqual(before);
});

test("the animation switch stops movement without disabling the form", async ({ page }) => {
  const cats = page.getByTestId("cats");
  await page.mouse.move(2, 2);
  await page.getByRole("checkbox", { name: "互动动画", exact: true }).uncheck();
  await expect(cats).toHaveAttribute("data-motion", "off");
  await page.mouse.move(900, 650);
  await expect.poll(async () => page.getByTestId("cat-pupil").evaluateAll((pupils) =>
    pupils.every((pupil) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(pupil).transform);
      return Math.abs(matrix.m41) < 0.01 && Math.abs(matrix.m42) < 0.01;
    }),
  )).toBe(true);
  expect(await cats.evaluate((element) =>
    element.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"),
  )).toBe(false);
  await page.getByLabel(/^密码(?:\s|$)/).fill("still-editable");
  await expect(cats).toHaveAttribute("data-state", "covering");
  await expect(page.getByLabel(/^密码(?:\s|$)/)).toHaveValue("still-editable");
});

test("system reduced motion disables animation on load and still allows the demo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByTestId("cats")).toHaveAttribute("data-motion", "off");
  await expect(page.getByRole("checkbox", { name: "互动动画", exact: true })).not.toBeChecked();
  await page.getByLabel(/^账号(?:\s|$)/).fill("示例访客");
  await page.getByLabel(/^密码(?:\s|$)/).fill("example-only");
  await page.getByRole("button", { name: "进入我们的小屋" }).click();
  await expect(page.getByText(/演示完成/)).toBeVisible();
  await expect(page.getByText(/未进行真实登录/)).toBeVisible();
});
