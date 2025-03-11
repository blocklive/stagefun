import { useState } from "react";
import { useContractInteraction } from "../../hooks/useContractInteraction";

interface GetUSDCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetUSDCModal({ isOpen, onClose }: GetUSDCModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { walletAddress } = useContractInteraction();

  const handleGetUSDC = async () => {
    if (!walletAddress) {
      setError("Wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/get-testnet-usdc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get USDC");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-black w-full max-w-md rounded-t-3xl p-6 border border-gray-800">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center mt-2 mb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Get testnet USDC</h2>
          <p className="text-gray-400 text-center mt-2">
            Testnet tokens are for development purposes only, they do not have
            real value.
          </p>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 bg-opacity-30 border border-green-700 text-green-200 p-3 rounded-lg mb-4">
            Successfully received 0.1 USDC!
          </div>
        )}

        <button
          onClick={handleGetUSDC}
          disabled={isLoading}
          className="w-full py-3 bg-white text-black font-medium rounded-lg flex items-center justify-center"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Get USDC"
          )}
        </button>
      </div>
    </div>
  );
}
