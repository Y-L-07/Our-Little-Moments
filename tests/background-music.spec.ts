import { expect, test } from "@playwright/test";

test("opening the page requests audible playback and the music control can pause and resume it", async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.dataset.requested = "yes";
      return play.call(this);
    };
  });
  await page.goto("/");
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("data-requested", "yes");
  expect(await audio.evaluate((element: HTMLAudioElement) => element.loop && !element.muted && element.volume > 0)).toBe(true);
  if (await audio.evaluate((element: HTMLAudioElement) => element.paused)) {
    await page.getByRole("button", { name: "播放音乐", exact: true }).click();
  }
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
  await page.getByRole("button", { name: "暂停音乐" }).click();
  await page.getByRole("button", { name: "编辑笔记" }).click();
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.reload();
  const resume = page.getByRole("button", { name: "播放音乐", exact: true });
  await expect(resume).toBeEnabled();
  await expect(audio).not.toHaveAttribute("data-requested", "yes");
  await resume.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "暂停音乐" })).toBeVisible();
});

test("a visitor interaction starts real audio after the first autoplay attempt is denied", async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let activated = false;
    document.addEventListener("click", event => { activated ||= event.isTrusted; }, true);
    HTMLMediaElement.prototype.play = function () {
      if (!activated) {
        this.dataset.blocked = "yes";
        return Promise.reject(new DOMException("Gesture required", "NotAllowedError"));
      }
      return play.call(this);
    };
  });
  await page.goto("/");
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("data-blocked", "yes");
  await page.getByRole("button", { name: "编辑笔记" }).click();
  await expect(page.getByRole("button", { name: "暂停音乐" })).toBeVisible();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.duration)).toBeCloseTo(20);
});
