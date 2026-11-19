import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Little Moments · 我们的小日子",
  description: "月光下的共同笔记。任何能打开这一页的人，都可以读一读，写下今天的小事。",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
