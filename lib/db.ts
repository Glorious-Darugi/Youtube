import "server-only";
import { sql } from "@vercel/postgres";

/**
 * 필요한 테이블을 (없으면) 만든다.
 *  - google_accounts : 로그인한 구글 계정의 refresh token (수익 조회용)
 *  - video_costs     : 영상별 프리랜서 비용 (직접 입력, 원화)
 */
let ready: Promise<void> | null = null;

export async function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS google_accounts (
        email TEXT PRIMARY KEY,
        refresh_token TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS video_costs (
        video_id TEXT PRIMARY KEY,
        cost BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`;
    })();
  }
  return ready;
}

export { sql };
