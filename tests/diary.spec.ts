import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

function entry(date: string, title: string) {
  const id = randomUUID();
  return { id, date, title: `${title} · ${id}`, text: "黄昏时，我们一起去湖边散步。" };
}

test("visitors can write multiple entries for one day, find them by date, and cancel an edit", async ({ page, request }) => {
  const originalNote = await (await request.get("/api/note")).json();
  const morning = entry("2024-02-29", "闰日清晨");
  const tomorrow = entry("2024-03-01", "三月第一天");
  const evening = entry(morning.date, "闰日傍晚");
  for (const record of [morning, tomorrow]) {
    expect((await request.post("/api/diary", { data: record })).status()).toBe(201);
  }
  await page.goto("/");
  await page.getByRole("link", { name: "打开日记本" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "日记本" })).toBeVisible();
  await page.getByRole("button", { name: "写日记" }).click();
  await page.getByLabel("日期", { exact: true }).fill(evening.date);
  await page.getByLabel("标题", { exact: true }).fill(evening.title);
  await page.getByLabel("正文", { exact: true }).fill(evening.text);
  await page.getByRole("button", { name: "保存日记" }).click();
  await expect(page.getByRole("heading", { name: evening.title })).toBeVisible();

  const filter = page.getByLabel("按日期筛选");
  const item = (title: string) => page.getByRole("button", { name: title, exact: true });
  await filter.fill(morning.date);
  await expect(item(tomorrow.title)).toHaveCount(0);
  await expect(item(morning.title)).toBeVisible();
  await item(evening.title).click();
  await page.getByRole("button", { name: "编辑日记" }).click();
  await page.getByLabel("正文", { exact: true }).fill("取消后不应保存这句话。");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByText(evening.text, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(item(tomorrow.title)).toBeVisible();
  await page.getByRole("link", { name: "返回共同笔记" }).click();
  await expect(page.getByRole("button", { name: "编辑笔记" })).toBeVisible();
  expect(await (await request.get("/api/note")).json()).toEqual(originalNote);
});

test("independent visitors can compare a stale diary draft and save a merged version", async ({ page, browser, baseURL, request }) => {
  const record = entry("2025-06-14", "周末手记");
  expect((await request.post("/api/diary", { data: record })).status()).toBe(201);
  const secondContext = await browser.newContext({ baseURL });
  try {
    const other = await secondContext.newPage();
    for (const visitor of [page, other]) {
      await visitor.goto("/diary");
      await visitor.getByRole("button", { name: record.title, exact: true }).click();
      await visitor.getByRole("button", { name: "编辑日记" }).click();
    }
    const first = "去旧书店看书。";
    const second = "一起去买花。";
    await page.getByLabel("正文", { exact: true }).fill(first);
    const draft = other.getByLabel("正文", { exact: true });
    await draft.fill(second);
    await page.getByRole("button", { name: "保存日记" }).click();
    await expect(page.getByText(first, { exact: true })).toBeVisible();
    await other.getByRole("button", { name: "保存日记" }).click();
    await expect(other.getByRole("region", { name: "最新保存的版本" })).toContainText(first);
    await expect(draft).toHaveValue(second);
    const combined = first + second;
    await draft.fill(combined);
    await other.getByRole("button", { name: "保存日记" }).click();
    await expect(other.getByText(combined, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: record.title, exact: true }).click();
    await expect(page.getByText(combined, { exact: true })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});

test("creation retries never duplicate or overwrite a diary entry, and invalid edits preserve it", async ({ request }) => {
  const record = entry("2028-02-29", "再过一个闰日");
  const create = await request.post("/api/diary", { data: record });
  expect(create.status()).toBe(201);
  const saved = await create.json();
  expect(saved).toMatchObject(record);
  const retry = await request.post("/api/diary", { data: record });
  expect(retry.status()).toBe(200);
  expect(await retry.json()).toEqual(saved);
  expect((await request.post("/api/diary", { data: { ...record, title: "重复的编号" } })).status()).toBe(409);
  for (const patch of [{ date: "2027-02-29" }, { title: " " }, { text: "月".repeat(5001) }]) {
    expect((await request.put("/api/diary", { data: { ...saved, ...patch } })).status()).toBe(400);
  }
  const { entries } = await (await request.get("/api/diary", { params: { date: record.date } })).json();
  expect(entries.filter((row: { id: string }) => row.id === record.id)).toHaveLength(1);
  expect(await (await request.get("/api/diary", { params: { id: record.id } })).json()).toEqual(saved);
  expect((await request.get("/api/diary", { params: { id: randomUUID() } })).status()).toBe(404);
});
