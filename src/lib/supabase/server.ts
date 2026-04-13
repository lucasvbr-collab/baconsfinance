import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieRow = {
  name: string;
  value: string;
  options?: Record<string, string | number | boolean | string[] | undefined>;
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieRow[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* ignorado em Server Components */
          }
        },
      },
    },
  );
}
