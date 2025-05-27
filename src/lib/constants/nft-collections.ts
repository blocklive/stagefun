export interface NFTCollection {
  id: string;
  name: string;
  contractAddress: string;
  multiplier: number;
  icon?: string;
  buyUrl?: string;
}

// Single source of truth for NFT collections and their multipliers
export const NFT_COLLECTIONS: NFTCollection[] = [
  {
    id: "stage-nft",
    name: "Stage NFT",
    contractAddress: "0x39fa705f2441c1265cf3c0f677144edc61a53ac4",
    multiplier: 1.1,
    buyUrl: "https://magiceden.us/collections/stage-nft",
  },
  {
    id: "jerry",
    name: "Jerry",
    contractAddress: "0xf3ad8b549d57004e628d875d452b961affe8a611",
    multiplier: 1.3,
    buyUrl:
      "https://magiceden.us/collections/monad-testnet/0xf3ad8b549d57004e628d875d452b961affe8a611",
    icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//jerry.avif",
  },
  // {
  //   id: "lil-chogstars",
  //   name: "lil chogstars",
  //   contractAddress: "0x26c86f2835c114571df2b6ce9ba52296cc0fa6bb",
  //   multiplier: 1.15,
  //   icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//lil-chogstars-nft.jpg",
  //   buyUrl:
  //     "https://magiceden.us/collections/monad-testnet/0x26c86f2835c114571df2b6ce9ba52296cc0fa6bb",
  // },
  // {
  //   id: "spikes",
  //   name: "Spikes",
  //   contractAddress: "0x87e1f1824c9356733a25d6bed6b9c87a3b31e107", // Replace with actual contract address
  //   multiplier: 1.25,
  //   buyUrl:
  //     "https://magiceden.us/collections/monad-testnet/0x87e1f1824c9356733a25d6bed6b9c87a3b31e107",
  //   icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//spike-nft.avif",
  // },
  // {
  //   id: "skrumpets",
  //   name: "Skrumpets",
  //   contractAddress: "0xe8f0635591190fb626f9d13c49b60626561ed145", // Replace with actual contract address
  //   multiplier: 1.3,
  //   buyUrl:
  //     "https://magiceden.us/collections/monad-testnet/0xe8f0635591190fb626f9d13c49b60626561ed145",
  //   icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//skrumpets-nft.png",
  // },
];

// Helper to get multiplier by collection ID
export function getNftMultiplierById(collectionId: string | null): number {
  if (!collectionId) return 1.0;
  const collection = NFT_COLLECTIONS.find((c) => c.id === collectionId);
  return collection?.multiplier || 1.0;
}

// Helper to get collection by ID
export function getNftCollectionById(
  collectionId: string
): NFTCollection | null {
  return NFT_COLLECTIONS.find((c) => c.id === collectionId) || null;
}

// Create a lookup map for faster access
export const NFT_MULTIPLIERS: Record<string, number> = NFT_COLLECTIONS.reduce(
  (acc, collection) => {
    acc[collection.id] = collection.multiplier;
    return acc;
  },
  {} as Record<string, number>
);
