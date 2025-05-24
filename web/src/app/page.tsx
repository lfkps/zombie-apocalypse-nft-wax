"use client";
import { useState } from "react";
import { SessionKit } from "@wharfkit/session";
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import axios from "axios";
import Image from "next/image";

const WAX_CHAIN = {
  id: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
  url: process.env.NEXT_PUBLIC_WAX_RPC || "https://testnet.waxsweden.org",
};
const COLLECTION = process.env.NEXT_PUBLIC_WAX_COLLECTION || "fishergame11";

export default function Home() {
  // Placeholder para estado de login e inventário
  const [account, setAccount] = useState<string | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Login Anchor
  async function handleLogin() {
    setLoading(true);
    try {
      const sessionKit = new SessionKit({
        appName: "Zombie Apocalypse NFT",
        chains: [{
          id: WAX_CHAIN.id,
          url: WAX_CHAIN.url,
        }],
        walletPlugins: [new WalletPluginAnchor()],
        ui: new (await import("@wharfkit/web-renderer")).WebRenderer(),
      });
      const loginResult = await sessionKit.login();
      const actor = loginResult.session.actor.toString();
      setAccount(actor);
      // Salvar usuário no backend
      await axios.post("/api/save-user", { account: actor });
      fetchInventory(actor);
    } catch (e) {
      setToast("Falha no login: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  // Buscar inventário NFT
  async function fetchInventory(account: string) {
    setInventory([]);
    try {
      const url = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${account}&collection_name=${COLLECTION}`;
      const { data } = await axios.get(url);
      setInventory(data.data || []);
    } catch {
      setToast("Erro ao buscar inventário");
    }
  }

  // Mint NFT
  async function handleMint() {
    if (!account) return;
    setMinting(true);
    try {
      const { data } = await axios.post("/api/mint-nft", { account });
      if (data.success) {
        setToast("NFT enviado para sua wallet!");
        fetchInventory(account);
      } else {
        setToast(data.error || "Erro ao mintar NFT");
      }
    } catch {
      setToast("Erro ao mintar NFT");
    } finally {
      setMinting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl flex flex-col items-center gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-green-400 drop-shadow-lg">🧟 Zombie Apocalypse NFT</h1>
        <p className="text-zinc-400 text-center">Colete seu NFT exclusivo na WAX Testnet!<br/>Login via Anchor Wallet.</p>
        {!account ? (
          <button
            className="mt-4 px-6 py-2 rounded bg-green-600 hover:bg-green-700 font-semibold shadow"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Conectando..." : "Login com Anchor"}
          </button>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-sm text-zinc-300">Wallet conectada:</span>
            <span className="font-mono text-lg text-green-300">{account}</span>
            <button
              className="mt-2 px-4 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
              onClick={() => setAccount(null)}
            >Desconectar</button>
          </div>
        )}
      </header>

      {account && (
        <main className="w-full max-w-2xl flex flex-col items-center gap-8">
          <section className="w-full">
            <h2 className="text-xl font-semibold mb-2">Seus NFTs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {inventory.length === 0 ? (
                <div className="col-span-4 text-zinc-400 text-center">Nenhum NFT encontrado.</div>
              ) : (
                inventory.map((nft, i) => (
                  <div key={i} className="bg-zinc-900 rounded p-2 flex flex-col items-center">
                    <Image
                      src={nft.data.img ? `https://ipfs.io/ipfs/${nft.data.img.replace('ipfs://', '')}` : "/placeholder.png"}
                      alt="NFT"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded mb-2"
                      onError={(event) => { (event.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-zinc-300">ID: {nft.asset_id}</span>
                  </div>
                ))
              )}
            </div>
          </section>
          <button
            className="px-8 py-3 rounded bg-green-600 hover:bg-green-700 font-bold text-lg shadow mt-4"
            onClick={handleMint}
            disabled={minting}
          >
            {minting ? "Coletando..." : "Coletar NFT"}
          </button>
        </main>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-700 text-white px-6 py-3 rounded shadow-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}
