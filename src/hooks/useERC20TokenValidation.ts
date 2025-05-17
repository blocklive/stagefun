import useSWR from "swr";
import { ethers } from "ethers";
import { Token } from "@/types/token";

// ERC20 ABI with just the functions we need
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// Fetcher function for SWR
const fetchTokenInfo = async (address: string): Promise<Token | null> => {
  if (!address || !ethers.isAddress(address)) {
    console.log("🔍 ERC20Validation: Invalid address format", address);
    throw new Error("Invalid token address");
  }

  console.log("🔍 ERC20Validation: Attempting to validate token at", address);

  try {
    // Use public RPC provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );

    // Create contract instance
    const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);

    console.log("🔍 ERC20Validation: Fetching token metadata...");

    // Fetch token metadata in parallel
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name().catch((e) => {
        console.log("🔍 ERC20Validation: Error fetching name", e);
        return "Unknown Token";
      }),
      tokenContract.symbol().catch((e) => {
        console.log("🔍 ERC20Validation: Error fetching symbol", e);
        return "UNKNOWN";
      }),
      tokenContract.decimals().catch((e) => {
        console.log("🔍 ERC20Validation: Error fetching decimals", e);
        return 18;
      }),
    ]);

    // Use a generic token logo
    const logoURI = "/icons/generic-token.svg";

    // Convert to checksum address
    const checksumAddress = ethers.getAddress(address);

    const token: Token = {
      address: checksumAddress,
      name,
      symbol,
      decimals: Number(decimals),
      logoURI,
      isCustom: true,
      source: "custom",
    };

    console.log("🔍 ERC20Validation: Successfully validated token", token);

    return token;
  } catch (error) {
    console.error("🔍 ERC20Validation: Error fetching token data:", error);
    throw new Error("Failed to fetch token data");
  }
};

export function useERC20TokenValidation(address: string | null) {
  // Normalize the address if it doesn't have 0x prefix
  const normalizedAddress =
    address && !address.startsWith("0x") ? `0x${address}` : address;

  // Only validate if we have an address and it's in the right format
  const shouldValidate =
    normalizedAddress && ethers.isAddress(normalizedAddress);

  const { data, error, isValidating } = useSWR(
    shouldValidate ? ["validateERC20", normalizedAddress] : null,
    () => fetchTokenInfo(normalizedAddress!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // Cache for 1 hour
      errorRetryCount: 2,
    }
  );

  return {
    tokenData: data,
    isValidating,
    error,
    isValid: !!data && !error,
  };
}
