// main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { seiTestnet } from "@reown/appkit/networks";

// const projectId = '61dbb82ce8ad05c7ea97dc2a451b1262';

// createAppKit({
//   adapters: [new EthersAdapter()],
//   networks: [seiTestnet],
//   projectId,
//   metadata: {
//     name: "SeiMoodBlocks",
//     description: "Set your mood on the blockchain!",
//     url: window.location.origin,
//     icons: ["https://example.com/icon.png"],
//   },
//   features: { analytics: true },
// });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
