import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/New_York" });

test("anniversaries follow the visitor's calendar across a leap day and daylight saving", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date("2024-03-11T03:30:00Z")); // March 10, 23:30 in New York
  const events = [
    { date: "2024-02-29", label: "已过去 10 天" },
    { date: "2024-03-10", label: "就是今天" },
    { date: "2024-03-11", label: "还有 1 天" },
  ].map(event => ({ ...event, id: randomUUID(), title: `一起旅行 · ${randomUUID()}` }));
  for (const { date, id, title } of events) {
    const data = { id, date, title };
    expect((await request.post("/api/anniversaries", { data })).status()).toBe(201);
    expect((await request.post("/api/anniversaries", { data })).status()).toBe(200);
  }
  await page.goto("/anniversaries");
  for (const { title, label } of events) {
    const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: title }) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(label);
  }
  const invalid = { ...events[0], version: 0, date: "2025-02-29" };
  expect((await request.put("/api/anniversaries", { data: invalid })).status()).toBe(400);
});

test("visitors create and edit an anniversary while keeping a conflicting draft", async ({ page, browser, baseURL }) => {
  const title = "第一次相遇 · " + randomUUID();
  await page.goto("/anniversaries");
  await page.getByRole("button", { name: "添加纪念日" }).click();
  await page.getByLabel("名称").fill(title);
  await page.getByLabel("纪念日期").fill("2027-07-12");
  await page.getByRole("button", { name: "保存纪念日" }).click();
  const edit = page.getByRole("button", { name: "编辑：" + title, exact: true });
  await expect(edit).toBeVisible();
  const context = await browser.newContext({ baseURL });
  try {
    const other = await context.newPage();
    await other.goto("/anniversaries");
    await other.getByRole("button", { name: "编辑：" + title, exact: true }).click();
    await other.getByLabel("纪念日期").fill("2027-07-14");
    await edit.click();
    await page.getByLabel("纪念日期").fill("2027-07-13");
    await page.getByRole("button", { name: "保存纪念日" }).click();
    await expect(page.getByRole("listitem").filter({ has: edit })).toContainText("2027-07-13");
    await other.getByRole("button", { name: "保存纪念日" }).click();
    await expect(other.getByText(/其他访客修改了这条纪念日/)).toBeVisible();
    await expect(other.getByLabel("纪念日期")).toHaveValue("2027-07-14");
    await other.getByRole("button", { name: "保存纪念日" }).click();
    await expect(other.getByLabel("纪念日期")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ has: edit })).toContainText("2027-07-14");
  } finally {
    await context.close();
  }
});
