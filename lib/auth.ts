import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { ensureTables, sql } from "./db";

/** 거부 시 어떤 이메일이었는지 진단 페이지에 알려주기 위한 쿠키 이름. */
export const REJECTED_EMAIL_COOKIE = "yt_rejected_email";

// 수익(YouTube Analytics)까지 읽기 위한 권한
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
].join(" ");

/** ALLOWED_EMAILS 에 등록된 이메일만 접근 허용 (수익은 민감 정보) */
export function isAllowed(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // 안전장치: 목록이 비어 있으면 아무도 통과시키지 않음
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // 설정 오류 등을 막연한 NextAuth 기본 페이지 대신 진단 페이지로 보낸다.
  pages: { error: "/auth/error" },
  providers: [
    Google({
      authorization: {
        params: { scope: SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!isAllowed(user.email)) {
        // 거부한 이메일을 짧은 수명 쿠키로 진단 페이지에 전달.
        // (NextAuth v5 가 signIn 콜백에서 반환한 URL 의 추가 쿼리를 잘라먹는 경우가 있어 쿠키가 더 확실)
        try {
          const c = await cookies();
          c.set(REJECTED_EMAIL_COOKIE, user.email || "", {
            maxAge: 120, // 2분이면 충분
            path: "/",
            sameSite: "lax",
            httpOnly: false,
          });
        } catch {
          /* 쿠키 설정이 막혀도 거부 자체는 정상 진행 */
        }
        return false;
      }
      // 첫 동의 시 받은 refresh token 을 저장 (이후 수익 조회에 사용)
      if (account?.refresh_token && user.email) {
        try {
          await ensureTables();
          await sql`INSERT INTO google_accounts (email, refresh_token, updated_at)
            VALUES (${user.email}, ${account.refresh_token}, now())
            ON CONFLICT (email) DO UPDATE
              SET refresh_token = EXCLUDED.refresh_token, updated_at = now()`;
        } catch (e) {
          console.error("refresh token 저장 실패:", e);
        }
      }
      return true;
    },
  },
});
