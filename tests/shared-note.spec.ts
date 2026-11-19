import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("any visitor can edit from the home page and cancel without saving", async ({ page, request }) => {
  const before = await (await request.get("/api/note")).json();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Our Little Moments" })).toBeVisible();
  await expect(page.locator('input[name="account"], input[type="password"]')).toHaveCount(0);
  const edit = page.getByRole("button", { name: "编辑笔记" });
  await edit.click();
  const draft = page.getByLabel("共同笔记", { exact: true });
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue(before.text);
  await draft.fill("取消这次修改");
  await page.getByRole("button", { name: "取消" }).click();
  await expect(edit).toBeFocused();
  expect(await (await request.get("/api/note")).json()).toEqual(before);
});

test("two independent visitors share edits and resolve a stale draft without losing either version", async ({ page, browser, baseURL }) => {
  const secondContext = await browser.newContext({ baseURL });
  try {
    const other = await secondContext.newPage();
    for (const visitor of [page, other]) {
      await visitor.goto("/");
      await visitor.getByRole("button", { name: "编辑笔记" }).click();
    }
    const firstText = `一起散步 · ${randomUUID()}`;
    const otherText = "沿途遇见一只小猫。";
    await page.getByLabel("共同笔记", { exact: true }).fill(firstText);
    const draft = other.getByLabel("共同笔记", { exact: true });
    await draft.fill(otherText);
    await page.getByRole("button", { name: "保存修改" }).click();
    await expect(page.getByText(firstText, { exact: true })).toBeVisible();

    await other.getByRole("button", { name: "保存修改" }).click();
    await expect(other.getByTestId("note-card").getByRole("alert")).toContainText("其他访客");
    await expect(draft).toHaveValue(otherText);
    await expect(other.getByText(firstText, { exact: true })).toBeVisible();
    const mergedText = firstText + "\n" + otherText;
    await draft.fill(mergedText);
    await other.getByRole("button", { name: "保存修改" }).click();
    await expect(draft).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "编辑笔记" }).click();
    await expect(page.getByLabel("共同笔记", { exact: true })).toHaveValue(mergedText);
  } finally {
    await secondContext.close();
  }
});

test("a failed save keeps the draft available to retry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "编辑笔记" }).click();
  const draft = page.getByLabel("共同笔记", { exact: true });
  const text = `雨后 · ${randomUUID()}`;
  await draft.fill(text);
  await page.route("**/api/note", route => route.abort(), { times: 1 });
  const save = page.getByRole("button", { name: "保存修改" });
  await save.click();
  await expect(page.getByTestId("note-card").getByRole("alert")).toContainText("重试");
  await expect(draft).toHaveValue(text);
  await save.click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});

test("invalid updates leave the shared note intact", async ({ request }) => {
  const before = await (await request.get("/api/note")).json();
  const malformed = await request.put("/api/note", { data: { version: before.version, text: 23 } });
  expect(malformed.status()).toBe(400);
  const oversized = await request.put("/api/note", { data: { version: before.version, text: "月".repeat(5001) } });
  expect(oversized.status()).toBe(400);
  const unreadable = await request.put("/api/note", { data: { version: before.version, text: "前\u0000后" } });
  expect(unreadable.status()).toBe(400);
  expect(await (await request.get("/api/note")).json()).toEqual(before);
});

test("desktop visitors can reach the editor without horizontal scrolling", async ({ page }) => {
  await page.goto("/");
  for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("button", { name: "编辑笔记" })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("visitors can read the saved text", async ({ page, request }) => {
    const note = await (await request.get("/api/note")).json();
    await page.goto("/");
    await expect(page.getByTestId("note-card")).toContainText(note.text || "空白");
    await expect(page.getByRole("button", { name: "编辑笔记" })).toBeDisabled();
  });
});
