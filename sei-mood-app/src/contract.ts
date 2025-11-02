// src/contract.ts
import { useEffect, useMemo, useCallback } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, ethers } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";

// Read RPC (Alchemy Sei testnet)
// @ts-expect-error
const READ_RPC = `https://sei-testnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`;

const contractAddress = "0x15905f91BF04A019413b7caE211976A7AAcb3B6F";

const contractABI = [
  "event MoodSet(address indexed user, uint256 blockNumber, string emoji)",
  "function setMood(string _emoji)",
  "function getBlockMood(uint256 blockNum) view returns (string)",
  "function getTopEmoji() view returns (string)",
  "function getGlobalHistory() view returns (tuple(address user,uint256 blockNumber,string emoji)[])",
  "function getUserHistory(address _user) view returns (tuple(address user,uint256 blockNumber,string emoji)[])"
];

export function useSeiMoodContract() {
  const { walletProvider }: any = useAppKitProvider?.("eip155") ?? {};
  const { address, isConnected } = useAppKitAccount?.() ?? {
    address: null,
    isConnected: false,
  };

  const readProvider = useMemo(() => new JsonRpcProvider(READ_RPC), []);

  const wallet = useMemo(() => {
    if (walletProvider) return new BrowserProvider(walletProvider);
    if (typeof window !== "undefined" && (window as any).ethereum)
      return new BrowserProvider((window as any).ethereum);
    return null;
  }, [walletProvider]);

  const readContract = useMemo(() => {
    return new Contract(contractAddress, contractABI, readProvider);
  }, [readProvider]);

  const contractWithSigner = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");
    const signer = await wallet.getSigner();
    return new Contract(contractAddress, contractABI, signer);
  }, [wallet]);

  async function setMood(emoji: string) {
    const c = await contractWithSigner();
    const tx = await c.setMood(emoji);
    await tx.wait();
  }


  async function getTopEmoji() {
    return await readContract.getTopEmoji();
  }

  // Event subscription using readContract (cheap)
  useEffect(() => {
    if (!readContract) return;

    const handler = (user: string, blockNumber: ethers.BigNumberish, emoji: string) => {
      // UI will subscribe via contract.on as needed; leaving empty here.
    };

    try {
      readContract.on("MoodSet", handler);
      return () => {
        readContract.off("MoodSet", handler);
      };
    } catch {
      return;
    }
  }, [readContract]);

  // Slow polling for provider internals (reduce noise)
  readProvider.pollingInterval = 30_000;

  return {
    provider: readProvider,
    address,
    setMood,
    getTopEmoji,
    contract: readContract,
    ethers,
  };
}
