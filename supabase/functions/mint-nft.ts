// Edge Function: mint-nft.ts
// Recebe { account }, valida rate-limit, faz mint do NFT na WAX Testnet e registra log
// Requer: eosjs, variáveis de ambiente WAX_RPC, WAX_PRIVATE_KEY, WAX_COLLECTION, WAX_TEMPLATE_ID
// @ts-expect-error: Import válido no ambiente Deno/Supabase Edge Functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const { account } = await req.json();
  if (!account) {
    return new Response('Missing account', { status: 400 });
  }
  const client = createClient();

  // Rate-limit: máximo 3 mints por conta
  const { count } = await client.from('mint_logs')
    .select('*', { count: 'exact', head: true })
    .eq('wax_account', account);
  if ((count ?? 0) >= 3) {
    return new Response(JSON.stringify({ error: 'Limite de mints atingido.' }), { status: 429 });
  }

  // Mint NFT usando eosjs
  try {
    const tx_id = await mintNFT(account);
    // Registrar log
    await client.from('mint_logs').insert({ wax_account: account, tx_id, template_id: Number(Deno.env.get('WAX_TEMPLATE_ID')) });
    return new Response(JSON.stringify({ success: true, tx_id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// Helper para criar o client do Supabase
function createClient() {
  // @ts-ignore
  return (globalThis as any).createSupabaseClient();
}

// Função para mintar NFT usando eosjs
async function mintNFT(new_asset_owner: string): Promise<string> {
  // Aqui você deve importar e usar eosjs para montar e assinar a transação
  // com os dados do payload fornecido no prompt.
  // Este é um placeholder, a implementação real depende do ambiente Deno + eosjs.
  throw new Error('Implementação do mintNFT pendente.');
} 