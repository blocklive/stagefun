import { useState } from "react";
import { ethers } from "ethers";
import useSWRMutation from "swr/mutation";
import { useSmartWallet } from "./useSmartWallet";
import showToast from "@/utils/toast";
import { NFT } from "./useWalletNFTs";

// ERC721 interface for NFT transfers
const ERC721_INTERFACE = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
];

// ERC1155 interface for multi-token NFT transfers
const ERC1155_INTERFACE = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
];

interface SendNFTArgs {
  destinationAddress: string;
  nft: NFT;
}

/**
 * Hook for sending NFTs using SWR mutation
 * @returns Functions and state for sending NFTs
 */
export function useSendNFT() {
  const [isSending, setIsSending] = useState(false);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();

  // Define the key for SWR
  const key = "nft-transfer";

  // Define the actual transfer function
  const transferNFT = async (_: string, { arg }: { arg: SendNFTArgs }) => {
    const { destinationAddress, nft } = arg;

    if (!nft || !smartWalletAddress) {
      throw new Error("No NFT or smart wallet available");
    }

    if (!ethers.isAddress(destinationAddress)) {
      throw new Error("Invalid destination address");
    }

    if (!nft.contractAddress || !nft.tokenId) {
      throw new Error(
        "Invalid NFT data - missing contract address or token ID"
      );
    }

    setIsSending(true);
    const loadingToast = showToast.loading("Processing NFT transfer...");

    try {
      // Normalize the contract address
      let contractAddress: string;
      try {
        contractAddress = ethers.getAddress(nft.contractAddress);
        console.log(
          `Using normalized NFT contract address: ${contractAddress}`
        );
      } catch (e) {
        console.error(
          `Invalid NFT contract address format: ${nft.contractAddress}`
        );
        throw new Error(`Invalid NFT contract address`);
      }

      // Determine if this is ERC721 or ERC1155 based on tokenType
      const isERC1155 =
        nft.tokenType?.toLowerCase().includes("erc1155") ||
        nft.tokenType?.toLowerCase().includes("1155");

      console.log("Sending NFT:", {
        name: nft.name,
        tokenId: nft.tokenId,
        contractAddress,
        tokenType: nft.tokenType,
        isERC1155,
      });

      // First, let's verify ownership before attempting transfer
      console.log("Verifying NFT ownership...");
      try {
        // Create a provider for reading contract data
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );

        if (isERC1155) {
          // For ERC1155, check balance
          const contract = new ethers.Contract(
            contractAddress,
            ERC1155_INTERFACE,
            provider
          );
          const balance = await contract.balanceOf(
            smartWalletAddress,
            nft.tokenId
          );

          console.log(
            `ERC1155 balance for token ${nft.tokenId}:`,
            balance.toString()
          );

          if (!balance || balance.toString() === "0") {
            throw new Error(
              `Smart wallet does not own this ERC1155 token (balance: ${balance.toString()})`
            );
          }
        } else {
          // For ERC721, check owner
          const contract = new ethers.Contract(
            contractAddress,
            ERC721_INTERFACE,
            provider
          );
          const owner = await contract.ownerOf(nft.tokenId);

          console.log(`ERC721 owner for token ${nft.tokenId}:`, owner);
          console.log(`Smart wallet address:`, smartWalletAddress);

          if (
            !owner ||
            owner.toLowerCase() !== smartWalletAddress.toLowerCase()
          ) {
            throw new Error(
              `Smart wallet does not own this ERC721 token. Owner: ${owner}, Smart Wallet: ${smartWalletAddress}`
            );
          }
        }

        console.log("✅ Ownership verified successfully");
      } catch (ownershipError) {
        console.error("❌ Ownership verification failed:", ownershipError);

        // Check if this is a "token doesn't exist" error
        if (
          ownershipError instanceof Error &&
          (ownershipError.message.includes("execution reverted") ||
            ownershipError.message.includes("require(false)") ||
            ownershipError.message.includes("CALL_EXCEPTION"))
        ) {
          throw new Error(
            `This NFT (Token ID: ${nft.tokenId}) does not exist or has been burned. It may be showing in your wallet due to outdated data.`
          );
        }

        throw ownershipError;
      }

      let result;

      if (isERC1155) {
        // Handle ERC1155 transfer
        console.log("Sending ERC1155 NFT");

        // For ERC1155, we transfer 1 unit of the token
        // The last parameter is empty bytes for data
        result = await callContractFunction(
          contractAddress as `0x${string}`,
          ERC1155_INTERFACE,
          "safeTransferFrom",
          [
            smartWalletAddress, // from
            destinationAddress, // to
            nft.tokenId, // id
            1, // amount (typically 1 for NFTs)
            "0x", // data (empty bytes)
          ],
          `Transferring ERC1155 NFT ${nft.name} (Token ID: ${nft.tokenId}) to ${destinationAddress}`
        );
      } else {
        // Handle ERC721 transfer (default)
        console.log("Sending ERC721 NFT");

        // Use safeTransferFrom for ERC721
        result = await callContractFunction(
          contractAddress as `0x${string}`,
          ERC721_INTERFACE,
          "safeTransferFrom",
          [
            smartWalletAddress, // from
            destinationAddress, // to
            nft.tokenId, // tokenId
          ],
          `Transferring ERC721 NFT ${nft.name} (Token ID: ${nft.tokenId}) to ${destinationAddress}`
        );
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to send NFT");
      }

      // Handle success
      showToast.success("NFT successfully sent!", { id: loadingToast });
      return result;
    } catch (error) {
      // Handle error
      console.error("Error sending NFT:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to send NFT",
        { id: loadingToast }
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  // Use SWR mutation
  const { trigger, isMutating, error, data, reset } = useSWRMutation(
    key,
    transferNFT,
    {
      throwOnError: false,
      onError: (err) => {
        console.error("SWR mutation error:", err);
      },
    }
  );

  // Wrapper function with more friendly signature
  const sendNFT = async (params: SendNFTArgs) => {
    try {
      return await trigger(params);
    } catch (error) {
      // Error is already handled in transferNFT
      return null;
    }
  };

  return {
    sendNFT,
    isSending: isSending || isMutating,
    error,
    data,
    reset,
  };
}
