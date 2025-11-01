import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { seiTestnet } from "@reown/appkit/networks";

const projectId = "61dbb82ce8ad05c7ea97dc2a451b1262"; // <- вставь свой ID из Reown Dashboard

const metadata = {
  name: "SeiMoodBlocks",
  description: "Set your mood on the blockchain!",
  url: "http://localhost:5173", // для разработки
  icons: ["https://example.com/icon.png"], // иконка вашего приложения
};

// Инициализация AppKit
export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [seiTestnet],
  projectId,
  metadata,
  features: { analytics: true },
});
