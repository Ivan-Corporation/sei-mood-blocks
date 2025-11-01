import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { Contract, BrowserProvider } from "ethers";

const contractAddress = "0x608AB8D6C0de12375E7B386396C1616F8a58B177";

const contractABI = [
  "function setMood(string _emoji)",
  "function getBlockMood(uint256 blockNum) view returns (string)",
  "function getTopEmoji() view returns (string)",
];

export function useSeiMoodContract() {
  const { walletProvider }: any = useAppKitProvider("eip155");
  const { address, isConnected } = useAppKitAccount();

  const provider:any =
    walletProvider ? new BrowserProvider(walletProvider) : null;

  async function setMood(emoji: string) {
    if (!isConnected || !provider) throw new Error("Wallet not connected");

    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, contractABI, signer);

    const tx = await contract.setMood(emoji);
    await tx.wait();
  }

  async function getBlockMood(blockNum: number) {
    if (!provider) return null;
    const contract = new Contract(contractAddress, contractABI, provider);
    return await contract.getBlockMood(blockNum);
  }

  async function getTopEmoji() {
    if (!provider) return null;
    const contract = new Contract(contractAddress, contractABI, provider);
    return await contract.getTopEmoji();
  }

  return {
    provider,        // ✅ теперь UI может читать блоки
    setMood,
    getBlockMood,
    getTopEmoji,
    address,
    isConnected,
  };
}
