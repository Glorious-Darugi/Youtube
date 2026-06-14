import "server-only";
import { ensureTables, sql } from "./db";

/** refresh token → access token */
async function accessTokenFrom(refresh: string): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID || "",
    client_secret: process.env.AUTH_GOOGLE_SECRET || "",
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

/**
 * 채널의 영상별 예상 수익(USD)을 가져온다.
 * 저장된 계정 토큰들을 차례로 시도해서, 그 채널을 소유한 계정의 토큰으로 성공시킨다.
 * (계정이 여러 개여도 자동으로 맞는 계정이 처리됨)
 */
export async function getChannelRevenueUSD(channelId: string): Promise<Record<string, number>> {
  await ensureTables();
  const { rows } = await sql`SELECT refresh_token FROM google_accounts`;
  const today = new Date().toISOString().slice(0, 10);

  for (const r of rows) {
    const token = await accessTokenFrom(r.refresh_token as string);
    if (!token) continue;

    const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    url.searchParams.set("ids", `channel==${channelId}`);
    url.searchParams.set("startDate", "2005-01-01");
    url.searchParams.set("endDate", today);
    url.searchParams.set("metrics", "estimatedRevenue");
    url.searchParams.set("dimensions", "video");
    url.searchParams.set("sort", "-estimatedRevenue");
    url.searchParams.set("maxResults", "200");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) continue; // 이 계정은 이 채널 권한 없음 → 다음 계정 시도

    const data = await res.json();
    if (Array.isArray(data.rows) && data.rows.length) {
      const map: Record<string, number> = {};
      for (const row of data.rows) map[row[0]] = Number(row[1] || 0);
      return map;
    }
  }
  return {};
}

/** 연결된 계정 수 (설정 안내용) */
export async function connectedAccountCount(): Promise<number> {
  await ensureTables();
  const { rows } = await sql`SELECT count(*)::int AS n FROM google_accounts`;
  return Number(rows[0]?.n || 0);
}
