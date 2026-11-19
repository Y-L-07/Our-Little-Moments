import { photoBytes } from "@/lib/diary";
import { uuid } from "@/lib/record-input";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const image = uuid.test(id) ? photoBytes(id) : undefined;
    if (!image) return Response.json({ error: "找不到这张照片。" }, { status: 404, headers });
    return new Response(image, { headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(image.byteLength) } });
  } catch {
    return Response.json({ error: "暂时无法读取照片，请稍后重试。" }, { status: 503, headers });
  }
}
