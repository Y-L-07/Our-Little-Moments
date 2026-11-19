function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Read a same-origin JSON object, including chunked requests without Content-Length. */
export async function readLocalJson(request: Request, maxBytes = 32768): Promise<Record<string, unknown> | Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin && origin !== `${url.protocol}//${request.headers.get("host")}`) {
    return error("请从本站页面提交。", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error("请使用 JSON 格式。", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return error("缺少请求内容。", 400);
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return error("内容过长，请缩短后重试。", 413);
      }
      chunks.push(chunk.value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return error("需要 JSON 对象。", 400);
    return value;
  } catch {
    return error("无法读取请求内容。", 400);
  }
}
