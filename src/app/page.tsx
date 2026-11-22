import { Wordmark } from "@/components/BrandMark";
import { AuthFormLoader } from "@/components/AuthFormLoader";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-plum px-4 pb-16 pt-[calc(env(safe-area-inset-top)+4rem)]">
      <Wordmark size="lg" />
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-[28px] bg-white/10" />}>
        <AuthFormLoader />
      </Suspense>
    </div>
  );
}
