import { expect, test } from "@playwright/test";
import { once } from "node:events";
import { createServer, type Server } from "node:http";

let model: Server;
let prompts: { role: string; content: string }[] = [];
let modelStatus = 200;

test.beforeAll(async () => {
  // Keep automated tests independent of the optional model download.
  model = createServer(async (req, res) => {
    if (req.url !== "/v1/chat/completions" || req.method !== "POST") {
      res.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    prompts = JSON.parse(Buffer.concat(chunks).toString()).messages;
    res.writeHead(modelStatus, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "测试模型的回复。" } }] }));
  });
  model.listen(39282, "127.0.0.1");
  await once(model, "listening");
});

test.afterAll(async () => {
  model.closeAllConnections();
  await new Promise<void>(resolve => model.close(() => resolve()));
});

test("saved memories survive a reload, reach the model, and can be forgotten", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "月光 AI 助手", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByLabel("给助手留言");
  await input.fill("请记住我们喜欢桂花茶");
  await dialog.getByRole("button", { name: "发送", exact: true }).click();
  await expect(dialog.getByText(/管理记忆/)).toContainText("1");
  await page.reload();
  await open.click();
  await input.fill("适合带什么饮品去野餐？");
  await dialog.getByRole("button", { name: "发送", exact: true }).click();
  await expect(dialog.getByText("测试模型的回复。", { exact: true })).toBeVisible();
  expect(prompts.at(-1)?.content).toContain("我们喜欢桂花茶");
  await dialog.getByText(/管理记忆/).click();
  await dialog.getByRole("button", { name: /删除记忆.*桂花茶/ }).click();
  await expect(dialog.getByText(/管理记忆/)).toContainText("0");
  await input.fill("这周末可以做什么？");
  await dialog.getByRole("button", { name: "发送", exact: true }).click();
  await expect(dialog.getByText("测试模型的回复。", { exact: true })).toHaveCount(2);
  expect(prompts.some(m => m.content.includes("桂花茶"))).toBe(false);
  expect(prompts.some(m => m.role === "assistant" && m.content === "测试模型的回复。")).toBe(true);
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
});

test("model outages allow a retry without duplicating a question", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "月光 AI 助手", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const question = "帮我想一个日记标题";
  await dialog.getByLabel("给助手留言").fill(question);
  modelStatus = 503;
  try {
    await dialog.getByRole("button", { name: "发送", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "重试发送" })).toBeVisible();
  } finally {
    modelStatus = 200;
  }
  await dialog.getByRole("button", { name: "重试发送" }).click();
  await expect(dialog.getByText("测试模型的回复。", { exact: true })).toBeVisible();
  expect(prompts.filter(m => m.content === question)).toHaveLength(1);
});

test("rejects invalid roles, oversized messages, and cross-site submissions", async ({ request }) => {
  const data = { memories: [], messages: [{ role: "user", content: "晚上好" }] };
  const post = (role: string, content: string) => request.post("/api/assistant", {
    data: { ...data, messages: [{ role, content }] },
  });
  expect((await post("system", "晚上好")).status()).toBe(400);
  expect((await post("user", "a".repeat(2001))).status()).toBe(400);
  expect((await request.post("/api/assistant", { data, headers: { Origin: "https://example.invalid" } })).status()).toBe(403);
});
