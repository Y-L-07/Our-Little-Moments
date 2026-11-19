import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../.local-data/model/", import.meta.url));
const executable = join(directory, "runtime", "llama-server.exe");
const weights = join(directory, "qwen2.5-0.5b-instruct-q4_k_m.gguf");

if (process.platform === "win32" && (!process.env.MOMENTS_AI_PORT || process.env.MOMENTS_AI_PORT === "39281") &&
    existsSync(executable) && existsSync(weights)) {
  const running = await fetch("http://127.0.0.1:39281/health", {
    signal: AbortSignal.timeout(1500), redirect: "error",
  }).catch(() => null);
  if (!running) {
    const model = spawn(executable, [
      "-m", weights, "--alias", "moments-journal", "--host", "127.0.0.1", "--port", "39281",
      "-c", "16384", "-np", "1", "-t", "4", "--offline", "--cache-ram", "0",
      "--cors-origins", "http://127.0.0.1:39281", "--log-disable", "--no-webui",
    ], { cwd: dirname(executable), detached: true, windowsHide: true, stdio: "ignore" });
    model.on("error", () => console.error("本机模型启动失败，请运行本地模型启动脚本检查安装。"));
    model.unref();
  }
}
