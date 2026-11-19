import { readLocalJson } from "@/lib/local-json";
import { invalidText, uuid } from "@/lib/record-input";
import { addWish, listWishes, setWishDone } from "@/lib/wishes";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  try {
    return json({ wishes: listWishes() });
  } catch {
    return json({ error: "暂时无法读取愿望清单。" }, 503);
  }
}

async function writeWish(request: Request) {
  const data = await readLocalJson(request, 2048);
  if (data instanceof Response) return data;
  if (typeof data.id !== "string" || !uuid.test(data.id)) {
    return json({ error: "愿望编号无效。" }, 400);
  }
  const id = data.id.toLowerCase();
  try {
    if (request.method === "POST") {
      if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 120 || invalidText.test(data.title)) {
        return json({ error: "请填写 1 至 120 个可保存的字符。" }, 400);
      }
      const title = data.title.trim();
      const { wish, created } = addWish(id, title);
      if (wish.title !== title) return json({ error: "这个编号已保存了另一条愿望，请刷新后再添加。" }, 409);
      return json(wish, created ? 201 : 200);
    }
    if (typeof data.done !== "boolean") return json({ error: "愿望完成状态无效。" }, 400);
    const wish = setWishDone(id, data.done);
    return wish ? json(wish) : json({ error: "找不到这条愿望，请刷新查看。" }, 404);
  } catch {
    return json({ error: "暂时无法保存愿望，请重试。" }, 503);
  }
}

export { writeWish as POST, writeWish as PUT };
