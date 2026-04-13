import { AuthFormLoader } from "@/components/AuthFormLoader";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-950 to-background px-4 py-16">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-card" />}>
        <AuthFormLoader />
      </Suspense>
    </div>
  );
}
