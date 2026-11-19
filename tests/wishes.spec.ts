import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("visitors add wishes and can check or uncheck them across browsers", async ({ page, browser, baseURL }) => {
  await page.goto("/wishes");
  const title = "一起去海边 · " + randomUUID();
  await page.getByLabel("新愿望").fill(title);
  await page.getByRole("button", { name: "添加愿望" }).click();
  const pending = page.getByRole("region", { name: "待完成", exact: true });
  const checkbox = pending.getByRole("checkbox", { name: title });
  await expect(checkbox).not.toBeChecked();
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("region", { name: "已完成", exact: true }).getByRole("checkbox", { name: title })).toBeChecked();
  const visitor = await browser.newContext({ baseURL });
  try {
    const other = await visitor.newPage();
    await other.goto("/wishes");
    const completed = other.getByRole("region", { name: "已完成", exact: true });
    await completed.getByRole("checkbox", { name: title }).click();
    await expect(other.getByRole("region", { name: "待完成", exact: true }).getByRole("checkbox", { name: title })).not.toBeChecked();
    await page.reload();
    await expect(checkbox).not.toBeChecked();
  } finally {
    await visitor.close();
  }
});

test("retries preserve a single wish and its requested state", async ({ request }) => {
  const data = { id: randomUUID(), title: "看一次流星雨" };
  expect((await request.post("/api/wishes", { data })).status()).toBe(201);
  expect((await request.post("/api/wishes", { data })).status()).toBe(200);
  expect((await request.post("/api/wishes", { data: { ...data, title: "不同的愿望" } })).status()).toBe(409);
  for (let i = 0; i < 2; i++) {
    const response = await request.put("/api/wishes", { data: { id: data.id, done: true } });
    expect(await response.json()).toMatchObject({ ...data, done: true });
  }
  expect((await request.put("/api/wishes", { data: { id: data.id, done: "false" } })).status()).toBe(400);
  expect((await request.post("/api/wishes", { data: { id: randomUUID(), title: " " } })).status()).toBe(400);
  const { wishes } = await (await request.get("/api/wishes")).json();
  expect(wishes.filter((wish: { id: string }) => wish.id === data.id)).toEqual([{ ...data, done: true }]);
});
