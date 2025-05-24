// Edge Function: mint-nft.ts
// Recebe { account }, valida rate-limit, faz mint do NFT na WAX Testnet e registra log
// @deno-types="npm:@supabase/supabase-js"
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="npm:eosjs"
import { Api, JsonRpc } from "npm:eosjs";
import { JsSignatureProvider } from "npm:eosjs/dist/eosjs-jssig.js";

// Supabase Edge Functions: use Deno.env para variáveis de ambiente
function createClient() {
  return createSupabaseClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
}

// Variáveis de ambiente para WAX
const WAX_RPC = Deno.env.get("WAX_RPC")!;
const WAX_PRIVATE_KEY = Deno.env.get("WAX_PRIVATE_KEY")!;
const WAX_COLLECTION = Deno.env.get("WAX_COLLECTION")!;
const WAX_TEMPLATE_ID = Number(Deno.env.get("WAX_TEMPLATE_ID")!);
const WAX_MINTER = Deno.env.get("WAX_MINTER")!; // Ex: "newgametests"
const WAX_SCHEMA = Deno.env.get("WAX_SCHEMA")!; // Ex: "baits"

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let account: string;
  try {
    const body = await req.json();
    account = body.account;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
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

  // LOG variáveis de ambiente
  console.log("ENV", {
    WAX_RPC, WAX_PRIVATE_KEY: !!WAX_PRIVATE_KEY, WAX_COLLECTION, WAX_TEMPLATE_ID, WAX_MINTER, WAX_SCHEMA
  });

  // LOG antes de mintar
  console.log("Mintando NFT para:", account);

  // Mint NFT usando eosjs
  try {
    const tx_id = await mintNFT(account);

    // LOG após mint
    console.log("Mint realizado, tx_id:", tx_id);

    // Registrar log
    await client.from('mint_logs').insert({ wax_account: account, tx_id, template_id: WAX_TEMPLATE_ID });
    return new Response(JSON.stringify({ success: true, tx_id }), { status: 200 });
  } catch (e: any) {
    console.error("Erro na função mint-nft:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// Função para mintar NFT usando eosjs
async function mintNFT(new_asset_owner: string): Promise<string> {
  const rpc = new JsonRpc(WAX_RPC);
  const signatureProvider = new JsSignatureProvider([WAX_PRIVATE_KEY]);
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  const result = await api.transact({
    actions: [{
      account: "atomicassets",
      name: "mintasset",
      authorization: [{
        actor: WAX_MINTER,
        permission: "active",
      }],
      data: {
        authorized_minter: WAX_MINTER,
        collection_name: WAX_COLLECTION,
        schema_name: WAX_SCHEMA,
        template_id: WAX_TEMPLATE_ID,
        new_asset_owner,
        immutable_data: [],
        mutable_data: [],
        tokens_to_back: [],
      }
    }]
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  });

  return result.transaction_id;
} 