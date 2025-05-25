import { useState, useMemo } from "react";
import { useWalletNFTs } from "./useWalletNFTs";
import { useSupabase } from "@/contexts/SupabaseContext";
import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";

export interface NFTCollection {
  id: string;
  name: string;
  contractAddress: string;
  multiplier: number;
  icon?: string;
  buyUrl?: string;
}

// Hardcoded NFT collections with contract addresses
const NFT_COLLECTIONS: NFTCollection[] = [
  {
    id: "stage-nft",
    name: "Stage NFT",
    contractAddress: "0x39fa705f2441c1265cf3c0f677144edc61a53ac4", // Replace with actual contract address
    multiplier: 1.1,
    buyUrl: "https://magiceden.us/collections/stage-nft",
  },
  {
    id: "lil-chogstars",
    name: "lil chogstars",
    contractAddress: "0x26c86f2835c114571df2b6ce9ba52296cc0fa6bb",
    multiplier: 1.15,
    icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//lil-chogstars-nft.jpg",
    buyUrl: "https://magiceden.us/collections/lil-chogstars",
  },
  {
    id: "spikes",
    name: "Spikes",
    contractAddress: "0x87e1f1824c9356733a25d6bed6b9c87a3b31e107", // Replace with actual contract address
    multiplier: 1.25,
    buyUrl:
      "https://magiceden.us/collections/monad-testnet/0x87e1f1824c9356733a25d6bed6b9c87a3b31e107",
    icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//spike-nft.avif",
  },
  {
    id: "skrumpets",
    name: "Skrumpets",
    contractAddress: "0xe8f0635591190fb626f9d13c49b60626561ed145", // Replace with actual contract address
    multiplier: 1.3,
    buyUrl:
      "https://magiceden.us/collections/monad-testnet/0xe8f0635591190fb626f9d13c49b60626561ed145",
    icon: "https://ynhuosvbkrazwivjuiwm.supabase.co/storage/v1/object/public/nft-images//skrumpets-nft.png",
  },
];

// Fetcher function for SWR
const fetchUserData = async ([url, token]: [string, string]) => {
  if (!token) {
    throw new Error("No access token available");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`);
  }

  return response.json();
};

export function useNFTPartners() {
  const { dbUser } = useSupabase();
  const { getAccessToken } = usePrivy();
  const { nfts, isLoading: nftsLoading } = useWalletNFTs(
    dbUser?.smart_wallet_address || null
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Use SWR to fetch user data (including selected_nft_collection)
  const { data: userData, mutate } = useSWR(
    dbUser ? "/api/user/profile" : null,
    async (url: string) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No access token available");
      }
      return fetchUserData([url, token]);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      errorRetryCount: 2,
    }
  );

  // Get user's owned NFT contract addresses
  const ownedContractAddresses = useMemo(() => {
    if (!nfts.length) return new Set<string>();
    return new Set(nfts.map((nft) => nft.contractAddress.toLowerCase()));
  }, [nfts]);

  // Enhance collections with ownership status
  const enhancedCollections = useMemo(() => {
    return NFT_COLLECTIONS.map((collection) => ({
      ...collection,
      owned: ownedContractAddresses.has(
        collection.contractAddress.toLowerCase()
      ),
    }));
  }, [ownedContractAddresses]);

  const ownedCollections = useMemo(
    () => enhancedCollections.filter((c) => c.owned),
    [enhancedCollections]
  );

  const lockedCollections = useMemo(
    () => enhancedCollections.filter((c) => !c.owned),
    [enhancedCollections]
  );

  // Get selected collection from database (source of truth)
  const selectedCollectionId = userData?.user?.selected_nft_collection || null;

  // Calculate active collection and multiplier from DATABASE state
  const activeCollection = useMemo(() => {
    if (selectedCollectionId) {
      return (
        enhancedCollections.find((c) => c.id === selectedCollectionId) || null
      );
    }
    // Auto-select first owned collection if no selection
    return ownedCollections[0] || null;
  }, [selectedCollectionId, enhancedCollections, ownedCollections]);

  const activeMultiplier = useMemo(() => {
    return activeCollection?.multiplier || 1.0;
  }, [activeCollection]);

  // Update NFT collection selection
  const selectCollection = async (collectionId: string) => {
    const collection = enhancedCollections.find((c) => c.id === collectionId);
    if (collection && collection.owned) {
      setDropdownOpen(false);

      try {
        // Get auth token
        const token = await getAccessToken();
        if (!token) {
          console.error("Failed to get authentication token");
          return;
        }

        // Update database
        const response = await fetch("/api/user/nft-collection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ collectionId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to update NFT collection:", errorData.error);
          return;
        }

        // Invalidate SWR cache to trigger refetch
        await mutate();
        console.log("NFT collection updated successfully");
      } catch (error) {
        console.error("Error updating NFT collection:", error);
      }
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const closeDropdown = () => {
    setDropdownOpen(false);
  };

  return {
    collections: enhancedCollections,
    ownedCollections,
    lockedCollections,
    selectedCollection: activeCollection?.id || null,
    activeCollection,
    activeMultiplier, // This comes from database via SWR
    selectCollection,
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    isLoading: nftsLoading || !userData,
  };
}
