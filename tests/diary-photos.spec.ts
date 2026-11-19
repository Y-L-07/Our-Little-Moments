import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

function exampleEntry(date: string) {
  const id = randomUUID();
  return { id, title: "晚霞 · " + id, date, text: "晚饭后，沿着河岸走了一小段。" };
}

async function samplePhoto() {
  const buffer = await sharp({ create: { width: 48, height: 32, channels: 3, background: "#cb997e" } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  return { name: "sunset.jpg", mimeType: "image/jpeg", buffer };
}

test("photos are previewed locally, saved with the diary, and visible to another visitor by date", async ({ page, browser, baseURL }) => {
  const diary = exampleEntry("2028-10-17");
  const file = await samplePhoto();
  const writes: string[] = [];
  page.on("request", r => {
    if (r.url().includes("/api/diary") && ["PUT", "POST"].includes(r.method())) writes.push(r.url());
  });
  await page.goto("/diary");
  await page.getByRole("button", { name: "写日记" }).click();
  await page.getByLabel("日期", { exact: true }).fill(diary.date);
  await page.getByLabel("标题", { exact: true }).fill(diary.title);
  await page.getByLabel("正文", { exact: true }).fill(diary.text);
  const picker = page.getByLabel("添加照片", { exact: true });
  await picker.setInputFiles(Array(7).fill(file));
  await expect(page.getByLabel("日记内页").getByRole("alert")).toContainText("最多添加 6 张");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), picker.click()]);
  await chooser.setFiles(file);
  await expect(page.getByAltText("已选照片 1")).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "保存日记", exact: true }).click();
  await expect(page.getByRole("heading", { name: diary.title })).toBeVisible();
  const visitor = await browser.newContext({ baseURL });
  try {
    const view = await visitor.newPage();
    await view.goto("/diary");
    await view.getByLabel("按日期筛选").fill(diary.date);
    await view.getByRole("button", { name: diary.title, exact: true }).click();
    const thumb = view.getByRole("button", { name: "查看第 1 张照片" });
    await thumb.click();
    const dialog = view.getByRole("dialog", { name: "照片大图" });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(32);
    await view.getByRole("button", { name: "关闭大图" }).click();
    await expect(thumb).toBeFocused();
    await view.getByRole("button", { name: "编辑日记" }).click();
    await view.getByRole("button", { name: "移除第 1 张照片" }).click();
    await view.getByRole("button", { name: "取消", exact: true }).click();
    await expect(thumb).toBeVisible();
  } finally {
    await visitor.close();
  }
});

test("photo and text writes are atomic, safe to retry, and compatible with text-only clients", async ({ request }) => {
  const entry = exampleEntry("2028-10-18");
  const id = randomUUID();
  const photoURL = "/api/diary/photos/" + id;
  const file = await samplePhoto();
  const multipart = { entry: JSON.stringify({ ...entry, photos: [id] }), ["photo:" + id]: file };
  const first = await request.post("/api/diary", { multipart });
  expect(first.status()).toBe(201);
  expect((await first.json()).photos).toEqual([id]);
  expect((await request.post("/api/diary", { multipart })).ok()).toBe(true);
  const image = await request.get(photoURL);
  expect(image.headers()["content-type"]).toBe("image/webp");
  const info = await sharp(await image.body()).metadata();
  expect(info).toMatchObject({ format: "webp", width: 32, height: 48 });
  expect(info.exif).toBeUndefined();

  const legacyUpdate = await request.put("/api/diary", { data: { ...entry, title: "另一个标题", version: 0 } });
  expect(legacyUpdate.status()).toBe(200);
  const current = await legacyUpdate.json();
  expect(current.photos).toEqual([id]);
  const stale = await request.put("/api/diary", {
    multipart: { entry: JSON.stringify({ ...entry, version: 0, photos: [] }) },
  });
  expect(stale.status()).toBe(409);
  expect((await stale.json()).current.photos).toEqual([id]);
  const invalidId = randomUUID();
  const invalid = await request.put("/api/diary", {
    multipart: { entry: JSON.stringify({ ...current, photos: [invalidId], text: "无效照片，整笔修改应撤回。" }),
      ["photo:" + invalidId]: { ...file, buffer: Buffer.from("Not an image") } },
  });
  expect(invalid.ok()).toBe(false);
  expect((await request.get("/api/diary/photos/" + invalidId)).status()).toBe(404);
  expect(await (await request.get("/api/diary?id=" + entry.id)).json()).toEqual(current);
  const removed = await request.put("/api/diary", { multipart: { entry: JSON.stringify({ ...current, photos: [] }) } });
  expect(removed.status()).toBe(200);
  expect((await removed.json()).photos).toEqual([]);
  expect((await request.get(photoURL)).status()).toBe(404);
});

test("a photo conflict keeps a local selection and the other visitor's new photo", async ({ page, request }) => {
  const entry = exampleEntry("2028-10-19");
  const original = randomUUID();
  const otherPhoto = randomUUID();
  const file = await samplePhoto();
  const created = await request.post("/api/diary", {
    multipart: { entry: JSON.stringify({ ...entry, photos: [original] }), ["photo:" + original]: file },
  });
  expect(created.status()).toBe(201);
  await page.goto("/diary");
  await page.getByLabel("按日期筛选").fill(entry.date);
  await page.getByRole("button", { name: entry.title, exact: true }).click();
  await page.getByRole("button", { name: "编辑日记" }).click();
  await page.getByLabel("添加照片", { exact: true }).setInputFiles(file);
  const updated = await request.put("/api/diary", {
    multipart: { entry: JSON.stringify({ ...entry, version: 0, photos: [otherPhoto] }), ["photo:" + otherPhoto]: file },
  });
  expect(updated.status()).toBe(200);
  const save = page.getByRole("button", { name: "保存日记", exact: true });
  await save.click();
  await expect(page.getByRole("region", { name: "最新保存的版本" })).toBeVisible();
  await save.click();
  await expect(page.getByRole("heading", { name: entry.title })).toBeVisible();
  const { photos } = await (await request.get("/api/diary?id=" + entry.id)).json();
  expect(photos).toHaveLength(2);
  expect(photos).toContain(otherPhoto);
  expect(photos).not.toContain(original);
});
