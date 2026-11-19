function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function readLocalBody<T>(request: Request, mediaType: string, maxBytes: number, parse: (body: Response) => Promise<T>) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin && origin !== `${url.protocol}//${request.headers.get("host")}`) {
    return error("请从本站页面提交。", 403);
  }
  const contentType = request.headers.get("content-type") || "";
  if (contentType.split(";")[0].trim().toLowerCase() !== mediaType) return error("请求格式不受支持。", 415);
  if (!request.body) return error("缺少请求内容。", 400);
  if (Number(request.headers.get("content-length")) > maxBytes) return error("请求内容过大。", 413);
  let bytes = 0;
  // Leave the incoming connection to the HTTP server when parsing stops early.
  const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > maxBytes) throw new Error("Body too large");
      controller.enqueue(chunk);
    },
  }), { preventCancel: true });
  try {
    return await parse(new Response(bounded, { headers: { "Content-Type": contentType } }));
  } catch {
    return bytes > maxBytes ? error("请求内容过大。", 413) : error("无法读取请求内容。", 400);
  }
}

export async function readLocalJson(request: Request, maxBytes = 32768): Promise<Record<string, unknown> | Response> {
  return readLocalBody(request, "application/json", maxBytes, async body => {
    const value = await body.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return error("需要 JSON 对象。", 400);
    return value;
  });
}

export function readLocalForm(request: Request, maxBytes: number) {
  return readLocalBody(request, "multipart/form-data", maxBytes, body => body.formData());
}
