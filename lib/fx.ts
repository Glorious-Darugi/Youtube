import "server-only";

/** 1 USD = ? KRW. 무료 환율 API 사용, 실패 시 환경변수/기본값. */
export async function getUsdKrw(): Promise<number> {
  const fallback = Number(process.env.USDKRW_FALLBACK || 1380);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 60 * 60 * 12 }, // 12시간 캐시
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const rate = data?.rates?.KRW;
    return typeof rate === "number" && rate > 0 ? rate : fallback;
  } catch {
    return fallback;
  }
}
