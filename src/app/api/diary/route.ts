import { createEntry, listEntries, readEntry, updateEntry } from "@/lib/diary";
import { readLocalJson } from "@/lib/local-json";

import { invalidText, uuid, validDate } from "@/lib/record-input";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const date = params.get("date");
  if (id !== null && (!uuid.test(id) || date !== null)) return json({ error: "日记编号或查询条件无效。" }, 400);
  if (date !== null && !validDate(date)) return json({ error: "请选择有效的日记日期。" }, 400);
  try {
    if (id === null) return json({ entries: listEntries(date) });
    const entry = readEntry(id);
    return entry ? json(entry) : json({ error: "找不到这篇日记。" }, 404);
  } catch {
    return json({ error: "暂时无法读取日记，请稍后重试。" }, 503);
  }
}

async function writeEntry(request: Request) {
  const input = await readLocalJson(request);
  if (input instanceof Response) return input;
  const { id, date, text, version } = input;
  const create = request.method === "POST";
  if (typeof id !== "string" || !uuid.test(id)) return json({ error: "日记编号无效。" }, 400);
  if (!validDate(date)) return json({ error: "请选择有效的日记日期。" }, 400);
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 80 ||
      typeof text !== "string" || !text.trim() || text.length > 5000) {
    return json({ error: "请填写标题和正文。标题最多 80 个字符，正文最多 5000 个字符。" }, 400);
  }
  if (invalidText.test(input.title) || invalidText.test(text)) {
    return json({ error: "日记含有无法保存的字符，请重新输入该段文字。" }, 400);
  }
  const entry = { id, date, title: input.title.trim(), text };
  try {
    let saved;
    if (create) saved = createEntry(entry);
    else {
      if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) {
        return json({ error: "日记版本无效。" }, 400);
      }
      saved = updateEntry({ ...entry, version });
    }
    if (saved) return json(saved, create ? 201 : 200);
    const current = readEntry(id);
    if (!current) return json({ error: "找不到这篇日记。" }, 404);
    if (create && current.date === date && current.title === entry.title && current.text === text) {
      return json(current);
    }
    return json({ current }, 409);
  } catch {
    return json({ error: "暂时无法保存日记，请稍后重试。" }, 503);
  }
}

export { writeEntry as POST, writeEntry as PUT };
