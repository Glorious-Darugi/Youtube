import { NextRequest, NextResponse } from "next/server";
import { auth, isAllowed } from "@/lib/auth";
import { ensureTables, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 모든 영상의 프리랜서 비용을 { videoId: 비용 } 으로 반환 */
export async function GET() {
  const session = await auth();
  if (!isAllowed(session?.user?.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureTables();
  const { rows } = await sql`SELECT video_id, cost FROM video_costs`;
  const costs: Record<string, number> = {};
  for (const r of rows) costs[r.video_id as string] = Number(r.cost);
  return NextResponse.json({ costs });
}

/** 한 영상의 비용 저장 (직접 입력) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAllowed(session?.user?.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const videoId: string | undefined = body?.videoId;
  const cost = Number(body?.cost);
  if (!videoId || !Number.isFinite(cost) || cost < 0) {
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  }
  await ensureTables();
  await sql`INSERT INTO video_costs (video_id, cost, updated_at)
    VALUES (${videoId}, ${Math.round(cost)}, now())
    ON CONFLICT (video_id) DO UPDATE
      SET cost = EXCLUDED.cost, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
