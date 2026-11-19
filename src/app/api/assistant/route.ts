import { readLocalJson } from "@/lib/local-json";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { messages: Message[]; memories: string[] };

const instruction = "你是月光手账里的中文助手。根据访客的问题简短、具体地回答，可以帮忙构思日记、约会或愿望。参考访客主动保存的记忆；不知道的事情就说不知道。你只能回复文字，不能查看或更改共同笔记。";

function validChat(value: unknown): value is Chat {
  if (!value || typeof value !== "object" || !("messages" in value) || !("memories" in value)) return false;
  const { messages, memories } = value;
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 12 &&
    messages.every(m => m && (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" && m.content.trim().length > 0 && m.content.length <= 2000) &&
    messages.at(-1).role === "user" &&
    Array.isArray(memories) && memories.length <= 12 &&
    memories.every(m => typeof m === "string" && m.trim().length > 0 && m.length <= 160);
}

function modelMessages({ messages, memories }: Chat) {
  const latest = messages[messages.length - 1];
  const content = memories.length
    ? `访客保存的记忆：\n${JSON.stringify(memories)}\n\n本次问题：\n${latest.content}`
    : latest.content;
  const history: Message[] = [{ role: "user", content }];
  // Reserve context for all saved memories, the newest question and the reply.
  let bytes = Buffer.byteLength(instruction) + Buffer.byteLength(content);
  for (let i = messages.length - 2; i >= 0; i--) {
    const { role, content: previous } = messages[i];
    bytes += Buffer.byteLength(previous) + 32;
    if (bytes > 13_000) break;
    history.unshift({ role, content: previous });
  }
  if (history[0].role === "assistant") history.shift();
  return [{ role: "system", content: instruction }, ...history];
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const chat = await readLocalJson(request, 160 * 1024);
  if (chat instanceof Response) return chat;
  if (!validChat(chat)) return error("消息或记忆的格式、长度有误。", 400);

  const port = Number(process.env.MOMENTS_AI_PORT || 39281);
  try {
    const result = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "moments-journal", messages: modelMessages(chat), temperature: 0.4, max_tokens: 256,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]),
    });
    if (!result.ok) return error("本机模型暂时无法作答，请稍后重试。", 503);
    const reply = (await result.json()).choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return error("模型没有返回文字，请重试。", 502);
    return Response.json({ reply: reply.trim() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return error("本机模型暂时没有响应，请确认已启动后重试。", 503);
  }
}
