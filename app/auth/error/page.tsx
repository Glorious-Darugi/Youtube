import Link from "next/link";

export const dynamic = "force-dynamic";

/** 환경변수 존재 여부만 본다(값은 절대 노출하지 않음). */
function present(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.trim());
}

const ERROR_TEXT: Record<string, string> = {
  Configuration:
    "서버 설정 문제입니다. 보통 환경변수가 빠졌을 때 납니다 — 특히 AUTH_SECRET, 그리고 구글 OAuth(AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET)를 확인하세요.",
  AccessDenied:
    "접근이 거부되었습니다. 로그인한 이메일이 ALLOWED_EMAILS 목록에 없을 수 있어요. (수익은 허용된 이메일만 볼 수 있습니다)",
  Verification: "로그인 링크가 만료되었거나 이미 사용되었습니다. 다시 시도하세요.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const code = error || "Default";
  const message =
    ERROR_TEXT[code] || "로그인 중 알 수 없는 오류가 발생했습니다.";

  // 수익/로그인 기능에 필요한 환경변수 점검 (값은 보여주지 않고 설정 여부만)
  const checks: { name: string; required: boolean; ok: boolean; hint: string }[] = [
    { name: "AUTH_SECRET", required: true, ok: present("AUTH_SECRET"), hint: "openssl rand -base64 32 로 만든 긴 랜덤 문자열" },
    { name: "AUTH_GOOGLE_ID", required: true, ok: present("AUTH_GOOGLE_ID"), hint: "구글 OAuth 클라이언트 ID" },
    { name: "AUTH_GOOGLE_SECRET", required: true, ok: present("AUTH_GOOGLE_SECRET"), hint: "구글 OAuth 클라이언트 비밀번호" },
    { name: "ALLOWED_EMAILS", required: true, ok: present("ALLOWED_EMAILS"), hint: "접근 허용 이메일(쉼표로 여러 개). 비어 있으면 아무도 로그인 못 함" },
    {
      name: "POSTGRES_URL",
      required: false,
      ok: present("POSTGRES_URL") || present("POSTGRES_PRISMA_URL") || present("DATABASE_URL"),
      hint: "Vercel Postgres 연결. 없으면 토큰 저장·수익 조회가 안 됨",
    },
  ];

  const missingRequired = checks.filter((c) => c.required && !c.ok);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        ← 홈으로
      </Link>

      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
        <h1 className="text-lg font-bold text-slate-800">로그인 오류</h1>
        <p className="mt-1 text-xs font-mono text-red-400">code: {code}</p>
        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-slate-500">환경변수 점검 (값은 표시되지 않음)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2">
              <span className="mt-0.5">{c.ok ? "✅" : c.required ? "❌" : "⚠️"}</span>
              <div>
                <span className="font-mono font-semibold text-slate-800">{c.name}</span>
                {!c.required && <span className="ml-1 text-xs text-slate-400">(선택)</span>}
                {!c.ok && <span className="ml-2 text-xs text-red-500">설정 안 됨</span>}
                <div className="text-xs text-slate-400">{c.hint}</div>
              </div>
            </li>
          ))}
        </ul>

        {missingRequired.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <b>{missingRequired.map((c) => c.name).join(", ")}</b> 이(가) 설정되지 않았습니다.
            Vercel → 프로젝트 → <b>Settings → Environment Variables</b> 에 추가한 뒤 <b>Redeploy</b> 하세요.
            (자세한 값은 README 7장 참고)
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            필수 환경변수는 모두 설정되어 있습니다. 그래도 오류가 난다면 구글 OAuth <b>리디렉션 URI</b>(
            <span className="font-mono">/api/auth/callback/google</span>)와 동의 화면의 <b>테스트 사용자</b>·범위를 확인하세요.
          </div>
        )}
      </div>

      <div>
        <Link
          href="/"
          className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          다시 시도
        </Link>
      </div>
    </div>
  );
}
