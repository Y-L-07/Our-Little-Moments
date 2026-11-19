import { listAnniversaries, readAnniversary, saveAnniversary } from "@/lib/anniversaries";
import { readLocalJson } from "@/lib/local-json";

import { invalidText, uuid, validDate } from "@/lib/record-input";

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  try {
    return json({ anniversaries: listAnniversaries() });
  } catch {
    return json({ error: "暂时无法读取纪念日。" }, 503);
  }
}

async function write(request: Request) {
  const input = await readLocalJson(request);
  if (input instanceof Response) return input;
  const { id, date, version } = input;
  const create = request.method === "POST";
  if (typeof id !== "string" || !uuid.test(id) ||
      (!create && (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0))) {
    return json({ error: "纪念日编号或版本无效。" }, 400);
  }
  if (!validDate(date)) return json({ error: "请选择有效日期。" }, 400);
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 80 ||
      invalidText.test(input.title)) {
    return json({ error: "请填写有效名称，最多 80 个字符。" }, 400);
  }
  const record = { id, date, title: input.title.trim() };
  try {
    const saved = saveAnniversary(record, create ? undefined : version as number);
    if (saved) return json(saved, create ? 201 : 200);
    const current = readAnniversary(id);
    if (!current) return json({ error: "找不到这条纪念日。" }, 404);
    if (current.date === record.date && current.title === record.title) return json(current);
    return json({ current }, 409);
  } catch {
    return json({ error: "暂时无法保存纪念日，请稍后重试。" }, 503);
  }
}

export { write as POST, write as PUT };
