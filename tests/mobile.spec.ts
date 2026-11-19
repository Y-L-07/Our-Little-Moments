import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Playwright's Firefox engine does not support isMobile contexts.
test.skip(({ browserName }) => browserName === "firefox");
test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: "reduce" });

async function expectPageWidth(page: Page, width: number) {
  await expect.poll(() => page.evaluate(() => ({
    layout: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))).toEqual({ layout: width, content: width });
}

test("320px touch screen supports the cats, shared note and assistant with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expectPageWidth(page, 320);
  await expect(page.getByTestId("cats")).toHaveAttribute("data-motion", "off");
  await page.getByRole("button", { name: "摸摸小橘" }).tap();
  await expect(page.getByTestId("cat-left")).toHaveAttribute("data-expression", "content");
  await page.getByRole("button", { name: "摸摸小灰" }).tap();
  await expect(page.getByTestId("cat-right")).toHaveAttribute("data-expression", "content");
  const reply = page.getByText("小灰：今天也要贴贴。");
  await expect(reply).toBeInViewport();
  const bubble = (await reply.boundingBox())!;
  const music = (await page.getByRole("button", { name: /音乐/ }).boundingBox())!;
  expect(bubble.y).toBeGreaterThanOrEqual(music.y + music.height);
  await expect(page.getByRole("link", { name: "日记本" })).toHaveCSS("min-height", "44px");

  await page.getByRole("button", { name: "编辑笔记" }).tap();
  const note = page.getByLabel("共同笔记", { exact: true });
  await expect(note).toHaveCSS("font-size", "16px");
  await note.fill("小屏上的共同笔记草稿");
  await page.setViewportSize({ width: 320, height: 290 });
  const save = page.getByRole("button", { name: "保存修改" });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "取消" }).tap();

  await page.getByRole("button", { name: "月光 AI 助手" }).tap();
  const dialog = page.getByRole("dialog", { name: "月光 AI 助手" });
  const message = dialog.getByLabel("给助手留言");
  await message.tap();
  await expect(message).toHaveCSS("font-size", "16px");
  await message.fill("记住：我们喜欢看海");
  await dialog.getByRole("button", { name: "发送" }).tap();
  await expect(dialog.getByText(/管理记忆（1\/12）/)).toBeVisible();
  await dialog.getByRole("button", { name: "关闭助手" }).tap();
  await expect(dialog).not.toBeVisible();
  await expectPageWidth(page, 320);
});

test("375px touch diary saves a photo with a shortened viewport and reopens it by date", async ({ page }) => {
  const title = "窗边的晚霞 · " + randomUUID();
  const date = "2029-06-23";
  const buffer = await sharp({ create: { width: 45, height: 30, channels: 3, background: "#d09a87" } }).png().toBuffer();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/diary");
  await page.getByRole("button", { name: "写日记" }).tap();
  await page.getByLabel("日期", { exact: true }).fill(date);
  await page.getByLabel("标题", { exact: true }).fill(title);
  const body = page.getByLabel("正文", { exact: true });
  await expect(body).toHaveCSS("font-size", "16px");
  await body.fill("今天的晚霞是杏粉色。");
  await page.getByLabel("添加照片", { exact: true }).setInputFiles({ name: "sky.png", mimeType: "image/png", buffer });
  await expect(page.getByAltText("已选照片 1")).toBeVisible();
  await expectPageWidth(page, 375);
  await body.tap();
  await page.setViewportSize({ width: 375, height: 315 });
  const save = page.getByRole("button", { name: "保存日记" });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  await save.tap();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload();
  await page.getByLabel("按日期筛选").fill(date);
  await page.getByRole("button", { name: title, exact: true }).tap();
  await page.getByRole("button", { name: "查看第 1 张照片" }).tap();
  const viewer = page.getByRole("dialog", { name: "照片大图" });
  await expect(viewer).toBeInViewport({ ratio: 1 });
  await expect.poll(() => viewer.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(45);
  await viewer.getByRole("button", { name: "关闭大图" }).tap();
  await expect(viewer).not.toBeVisible();
});

test("390px touch screen can save an anniversary and complete a wish", async ({ page }) => {
  const title = "看海的日子 · " + randomUUID();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "纪念日" }).tap();
  await page.getByRole("button", { name: "添加纪念日" }).tap();
  await expect(page.getByLabel("名称")).toHaveCSS("font-size", "16px");
  await page.getByLabel("名称").fill(title);
  await page.getByLabel("纪念日期").fill("2029-05-12");
  await page.getByRole("button", { name: "保存纪念日" }).tap();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expectPageWidth(page, 390);

  await page.getByRole("link", { name: "返回共同笔记" }).tap();
  await page.getByRole("link", { name: "愿望清单" }).tap();
  await page.getByLabel("新愿望").fill(title);
  await page.getByRole("button", { name: "添加愿望" }).tap();
  await page.getByRole("checkbox", { name: title }).tap();
  await expect(page.getByRole("region", { name: "已完成" }).getByRole("checkbox", { name: title })).toBeChecked();
  await expectPageWidth(page, 390);
});
