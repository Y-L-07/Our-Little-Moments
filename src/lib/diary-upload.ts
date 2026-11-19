import sharp from "sharp";
import { readLocalForm, readLocalJson } from "./local-json";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES } from "./photo-limits";
import { uuid } from "./record-input";

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readDiaryWrite(request: Request) {
  const files = new Map<string, File>();
  const multipart = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "multipart/form-data";
  let input: Record<string, unknown>;
  if (multipart) {
    // Leave room for the entry text, filenames and multipart boundaries.
    const form = await readLocalForm(request, MAX_UPLOAD_BYTES + 65536);
    if (form instanceof Response) return form;
    const entries = form.getAll("entry");
    if (entries.length !== 1 || typeof entries[0] !== "string" || Buffer.byteLength(entries[0]) > 32768) {
      return error("请提交一篇完整的日记。");
    }
    try {
      const value = JSON.parse(entries[0]);
      if (!value || typeof value !== "object" || Array.isArray(value)) return error("日记格式无效。");
      input = value;
    } catch {
      return error("无法读取日记内容。");
    }

    let addedBytes = 0;
    for (const [name, value] of form) {
      if (name === "entry") continue;
      const id = name.slice("photo:".length).toLowerCase();
      if (!name.startsWith("photo:") || !uuid.test(id) || files.has(id) || typeof value === "string") {
        return error("照片编号或上传格式无效。");
      }
      addedBytes += value.size;
      if (value.size === 0) return error("所选照片为空，请重新选择。");
      if (value.size > MAX_PHOTO_BYTES || addedBytes > MAX_UPLOAD_BYTES) {
        return error("每张照片最多 8 MiB，一次新增的照片合计最多 24 MiB。", 413);
      }
      files.set(id, value);
    }
  } else {
    const value = await readLocalJson(request);
    if (value instanceof Response) return value;
    input = value;
  }

  if (!multipart && input.photos === undefined) return { input, photos: undefined, files };
  if (!Array.isArray(input.photos) || input.photos.length > MAX_PHOTOS ||
      !input.photos.every((id): id is string => typeof id === "string" && uuid.test(id))) {
    return error(`每篇日记最多添加 ${MAX_PHOTOS} 张照片，请检查所选照片。`);
  }
  const photos = input.photos.map(id => id.toLowerCase());
  if (new Set(photos).size !== photos.length || [...files.keys()].some(id => !photos.includes(id))) {
    return error("照片清单与上传内容不一致，请重新选择。");
  }
  return { input, photos, files };
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function inputFormat(bytes: Buffer) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.subarray(0, 8).equals(pngSignature)) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
}

export async function preparePhotos(files: Map<string, File>) {
  const uploads = new Map<string, Buffer>();
  for (const [id, file] of files) {
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const format = inputFormat(bytes);
      if (!format) return error("请选择 JPEG、PNG 或 WebP 格式的照片。", 415);
      const decoder = sharp(bytes, { limitInputPixels: 50_000_000, failOn: "warning" });
      if ((await decoder.metadata()).format !== format) return error("无法确认照片格式，请重新选择。");
      const photo = await decoder.autoOrient()
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 }).toBuffer();
      uploads.set(id, photo);
    } catch {
      return error("无法读取照片，请选择完整且不超过 5000 万像素的图片。");
    }
  }
  return uploads;
}
