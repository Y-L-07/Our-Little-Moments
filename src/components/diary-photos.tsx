"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES } from "@/lib/photo-limits";
import styles from "./diary-photos.module.css";

export type DraftPhoto = { id: string; file?: File };

function supportedPhoto(file: File) {
  if (file.type) return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function photoUrl(id: string) {
  return "/api/diary/photos/" + id;
}

function DraftThumbnail({ photo, index }: { photo: DraftPhoto; index: number }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!photo.file) return;
    const url = URL.createObjectURL(photo.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.file]);
  const src = photo.file ? preview : photoUrl(photo.id);
  return src ? <img className={styles.thumb} src={src} alt={`已选照片 ${index + 1}`} /> : null;
}

export function PhotoPicker({ photos, onChange }: {
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
}) {
  const [error, setError] = useState("");
  function add(files: File[]) {
    if (!files.length) return;
    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`每篇日记最多添加 ${MAX_PHOTOS} 张照片，请减少选择后再试。`);
      return;
    }
    if (!files.every(supportedPhoto)) {
      setError("请选择 JPEG、PNG 或 WebP 格式的照片。");
      return;
    }
    if (files.some(f => !f.size || f.size > MAX_PHOTO_BYTES)) {
      setError("请选择有内容且每张不超过 8 MiB 的照片。");
      return;
    }
    const addedBytes = photos.reduce((sum, photo) => sum + (photo.file?.size ?? 0), 0);
    if (files.reduce((sum, file) => sum + file.size, addedBytes) > MAX_UPLOAD_BYTES) {
      setError("本次新增照片合计最多 24 MiB，请分次保存。");
      return;
    }
    setError("");
    onChange([...photos, ...files.map(file => ({ id: crypto.randomUUID(), file }))]);
  }

  return (
    <div className={styles.picker}>
      <label className={styles.add} htmlFor="diary-photos">
        添加照片
        <input id="diary-photos" type="file" multiple accept="image/jpeg,image/png,image/webp"
          aria-invalid={!!error} aria-describedby={error ? "diary-photo-help diary-photo-error" : "diary-photo-help"} onChange={event => {
            add(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }} />
      </label>
      <p id="diary-photo-help" className={styles.hint}>JPEG、PNG 或 WebP，最多 {MAX_PHOTOS} 张。每张最多 8 MiB，每次新增合计最多 24 MiB。</p>
      {error && <p id="diary-photo-error" className={styles.error} role="alert">{error}</p>}
      {photos.length > 0 && <ul className={styles.grid} aria-label="草稿照片">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <DraftThumbnail photo={photo} index={index} />
            <button type="button" className={styles.remove} aria-label={`移除第 ${index + 1} 张照片`}
              onClick={() => { setError(""); onChange(photos.filter(item => item.id !== photo.id)); }}>移除</button>
          </li>
        ))}
      </ul>}
    </div>
  );
}

export function PhotoGallery({ photos }: { photos: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <section aria-label="日记照片" className={styles.gallery}>
      <div className={styles.grid}>
        {photos.map((id, index) => (
          <button key={id} type="button" aria-label={`查看第 ${index + 1} 张照片`} aria-haspopup="dialog"
            onClick={event => {
              opener.current = event.currentTarget;
              setSelected(index);
              dialog.current?.showModal();
            }}>
            <img className={styles.thumb} loading="lazy" decoding="async" src={photoUrl(id)} alt={`日记照片 ${index + 1}`} />
          </button>
        ))}
      </div>
      <dialog ref={dialog} className={styles.viewer} aria-label="照片大图" onClose={() => {
        setSelected(null);
        opener.current?.focus();
      }}>
        {selected !== null && <img src={photoUrl(photos[selected])} alt={`日记照片 ${selected + 1} 大图`} />}
        <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>关闭大图</button>
      </dialog>
    </section>
  );
}
