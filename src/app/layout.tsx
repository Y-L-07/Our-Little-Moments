import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Little Moments · 我们的小日子",
  description: "把平凡的日子，写成我们的故事。情侣手账登录页界面演示，无真实登录功能。",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
