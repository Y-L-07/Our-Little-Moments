import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listWishes, type Wish } from "@/lib/wishes";
import WishList from "./wish-list";
import styles from "@/app/collections.module.css";

export const metadata: Metadata = { title: "愿望清单 · Our Little Moments" };

export default async function WishesPage() {
  await connection();
  let wishes: Wish[] | null = null;
  try { wishes = listWishes(); } catch { /* The page offers a reload if the database is temporarily unavailable. */ }
  return (
    <main className={"moonlight-page " + styles.page}>
      <div className={styles.sheet}>
        <Link className={styles.back} href="/">← 返回共同笔记</Link>
        <header className={styles.header}><h1>愿望清单</h1></header>
        {wishes ? <WishList initialWishes={wishes} /> : (
          <p className={styles.error} role="alert">暂时无法读取愿望清单。<a href="/wishes">重新加载</a></p>
        )}
      </div>
    </main>
  );
}
