// Edge Function: save-user.ts
// Recebe { account } e faz upsert na tabela users
// @deno-types="npm:@supabase/supabase-js"
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

function createClient() {
  return createSupabaseClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const { account } = await req.json();
  if (!account) {
    return new Response('Missing account', { status: 400 });
  }
  const client = createClient();
  const { error } = await client.from('users').upsert({ wax_account: account });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}); 