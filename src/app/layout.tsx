import type { Metadata } from "next";
import BackgroundMusic from "@/components/background-music";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Little Moments · 我们的小日子",
  description: "在共同笔记里留言，在日记本里按日期记下生活的小事。",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><BackgroundMusic />{children}</body></html>;
}
