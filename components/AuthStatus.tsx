"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export function AuthStatus() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-white/60">…</span>;
  }

  if (data?.user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden max-w-[160px] truncate text-white/80 sm:inline">
          {data.user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-full bg-white/15 px-3 py-1 font-medium text-white hover:bg-white/25"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand hover:bg-white/90"
    >
      로그인
    </button>
  );
}
