import { readNote, saveNote } from "@/lib/shared-note";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  try {
    return json(readNote());
  } catch {
    return json({ error: "暂时无法读取笔记。" }, 503);
  }
}

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${host}`) {
    return json({ error: "请从笔记页面保存。" }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "请使用 JSON 格式。" }, 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "缺少笔记内容。" }, 400);
  let input;
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > 32768) {
        await reader.cancel();
        return json({ error: "笔记最多可写 5000 字。" }, 413);
      }
      chunks.push(chunk.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json({ error: "无法读取笔记内容。" }, 400);
  }
  if (typeof input?.text !== "string" || input.text.length > 5000 ||
      !Number.isSafeInteger(input.version) || input.version < 0) {
    return json({ error: "笔记内容或版本无效。" }, 400);
  }
  // SQLite text cannot round-trip NULs or isolated UTF-16 surrogates.
  if (/[\u0000\uD800-\uDFFF]/u.test(input.text)) {
    return json({ error: "正文中含有无法保存的字符，请重新输入该段文字。" }, 400);
  }
  try {
    const saved = saveNote(input);
    return saved ? json(saved) : json({ current: readNote() }, 409);
  } catch {
    return json({ error: "暂时无法保存笔记。" }, 503);
  }
}
