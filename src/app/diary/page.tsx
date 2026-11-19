import type { Metadata } from "next";
import DiaryBook from "@/components/diary-book";

export const metadata: Metadata = {
  title: "日记本 · Our Little Moments",
  description: "按日期翻阅、记录和编辑我们的生活日记。",
};

export default function DiaryPage() {
  return <main className="moonlight-page diary-page"><DiaryBook /></main>;
}
