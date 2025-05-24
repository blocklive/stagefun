import { useState, useMemo } from "react";

export interface NFTCollection {
  id: string;
  name: string;
  multiplier: number;
  owned: boolean;
  locked: boolean;
  icon?: string;
  buyUrl?: string;
}

// Mock NFT collections based on the design
const NFT_COLLECTIONS: NFTCollection[] = [
  {
    id: "stage-nft-1",
    name: "Stage NFT",
    multiplier: 1.1,
    owned: true,
    locked: false,
  },
  {
    id: "stage-nft-2",
    name: "Stage NFT",
    multiplier: 1.1,
    owned: true,
    locked: false,
  },
  {
    id: "lil-chogstars",
    name: "lil chogstars",
    multiplier: 1.15,
    owned: true,
    locked: false,
  },
  {
    id: "tequila",
    name: "Tequila",
    multiplier: 1.2,
    owned: false,
    locked: true,
    buyUrl: "#",
  },
  {
    id: "spikes",
    name: "Spikes",
    multiplier: 1.25,
    owned: false,
    locked: true,
    buyUrl: "#",
  },
  {
    id: "bears",
    name: "Bears",
    multiplier: 1.3,
    owned: false,
    locked: true,
    buyUrl: "#",
  },
];

export function useNFTPartners() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    // Default to first owned collection
    NFT_COLLECTIONS.find((c) => c.owned && !c.locked)?.id || null
  );

  const collections = useMemo(() => NFT_COLLECTIONS, []);

  const ownedCollections = useMemo(
    () => collections.filter((c) => c.owned && !c.locked),
    [collections]
  );

  const lockedCollections = useMemo(
    () => collections.filter((c) => c.locked),
    [collections]
  );

  const activeMultiplier = useMemo(() => {
    if (!selectedCollection) return 1.0;
    const collection = collections.find((c) => c.id === selectedCollection);
    return collection?.multiplier || 1.0;
  }, [selectedCollection, collections]);

  const selectCollection = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection && collection.owned && !collection.locked) {
      setSelectedCollection(collectionId);
    }
  };

  return {
    collections,
    ownedCollections,
    lockedCollections,
    selectedCollection,
    activeMultiplier,
    selectCollection,
  };
}
