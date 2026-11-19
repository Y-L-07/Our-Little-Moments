import type { Metadata } from "next";
import { connection } from "next/server";
import AnniversaryList from "@/components/anniversary-list";
import { listAnniversaries, type Anniversary } from "@/lib/anniversaries";

export const metadata: Metadata = { title: "纪念日 · Our Little Moments" };

export default async function AnniversariesPage() {
  await connection();
  let records: Anniversary[] | null = null;
  try { records = listAnniversaries(); } catch { /* Show a reload link when storage is unavailable. */ }
  return <AnniversaryList initial={records} />;
}
