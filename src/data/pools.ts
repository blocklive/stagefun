export interface Pool {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  backgroundColor?: string;
}

export const pools: Pool[] = [
  {
    id: "ec-token",
    name: "E.C. token",
    symbol: "$SEC",
    description: "Community-driven meme token with utility",
    imageUrl: "/pepe1.png",
    backgroundColor: "bg-purple-500",
  },
  {
    id: "raave-token",
    name: "rAave token",
    symbol: "$rAave",
    description: "DeFi lending protocol governance token",
    imageUrl: "/pepe2.png",
    backgroundColor: "bg-purple-500",
  },
  {
    id: "moon-token",
    name: "Moon token",
    symbol: "$MOON",
    description: "Lunar-themed community token",
    imageUrl: "/moon.png",
    backgroundColor: "bg-blue-500",
  },
  {
    id: "pixel-token",
    name: "Pixel token",
    symbol: "$PIX",
    description: "NFT gaming ecosystem token",
    imageUrl: "/pixel.png",
    backgroundColor: "bg-green-500",
  },
  {
    id: "nova-finance",
    name: "Nova Finance",
    symbol: "$NOVA",
    description: "Next-gen DeFi yield aggregator",
    imageUrl: "/nova.png",
    backgroundColor: "bg-red-500",
  },
  {
    id: "cyber-dao",
    name: "Cyber DAO",
    symbol: "$CYBER",
    description: "Decentralized autonomous organization",
    imageUrl: "/cyber.png",
    backgroundColor: "bg-yellow-500",
  },
  {
    id: "meta-verse",
    name: "Meta Verse",
    symbol: "$META",
    description: "Metaverse gaming platform token",
    imageUrl: "/meta.png",
    backgroundColor: "bg-indigo-500",
  },
  {
    id: "defi-pulse",
    name: "DeFi Pulse",
    symbol: "$PULSE",
    description: "DeFi analytics and tracking token",
    imageUrl: "/defi.png",
    backgroundColor: "bg-pink-500",
  },
  {
    id: "eth-bridge",
    name: "ETH Bridge",
    symbol: "$BRIDGE",
    description: "Cross-chain interoperability protocol",
    imageUrl: "/bridge.png",
    backgroundColor: "bg-teal-500",
  },
  {
    id: "cosmos-hub",
    name: "Cosmos Hub",
    symbol: "$ATOM",
    description: "Interchain ecosystem governance token",
    imageUrl: "/cosmos.png",
    backgroundColor: "bg-orange-500",
  },
];
