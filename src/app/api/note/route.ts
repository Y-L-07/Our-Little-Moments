import { readNote, saveNote } from "@/lib/shared-note";
import { readLocalJson } from "@/lib/local-json";

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
  const input = await readLocalJson(request);
  if (input instanceof Response) return input;
  const { text, version } = input;
  if (typeof text !== "string" || text.length > 5000 ||
      typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) {
    return json({ error: "笔记内容或版本无效。" }, 400);
  }
  // SQLite text cannot round-trip NULs or isolated UTF-16 surrogates.
  if (/[\u0000\uD800-\uDFFF]/u.test(text)) {
    return json({ error: "正文中含有无法保存的字符，请重新输入该段文字。" }, 400);
  }
  try {
    const saved = saveNote({ text, version });
    return saved ? json(saved) : json({ current: readNote() }, 409);
  } catch {
    return json({ error: "暂时无法保存笔记。" }, 503);
  }
}
