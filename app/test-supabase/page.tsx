import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestSupabasePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("connection_test")
    .select("id, note, created_at");

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "monospace" }}>
        <h1>❌ Error de conexión con Supabase</h1>
        <pre style={{ color: "crimson" }}>{error.message}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>✅ Conexión con Supabase OK</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}