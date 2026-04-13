"use client";

import dynamic from "next/dynamic";

const AuthForm = dynamic(
  () => import("@/components/AuthForm").then((m) => ({ default: m.AuthForm })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-card" />
    ),
  },
);

export function AuthFormLoader() {
  return <AuthForm />;
}
