import { NextRequest, NextResponse } from "next/server";
import { auth, isAllowed } from "@/lib/auth";
import { getChannelRevenueUSD } from "@/lib/analytics";
import { getUsdKrw } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAllowed(session?.user?.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }
  try {
    const [usdMap, rate] = await Promise.all([getChannelRevenueUSD(channelId), getUsdKrw()]);
    const byVideo: Record<string, number> = {};
    let total = 0;
    for (const [vid, usd] of Object.entries(usdMap)) {
      const krw = Math.round(usd * rate);
      byVideo[vid] = krw;
      total += krw;
    }
    return NextResponse.json({ byVideo, total, rate });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
