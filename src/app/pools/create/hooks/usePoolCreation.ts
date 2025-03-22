import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useContractInteraction } from "@/contexts/ContractInteractionContext";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

export const usePoolCreation = () => {
  const router = useRouter();
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { createPoolWithDatabase, isLoading: isContractLoading } =
    useContractInteraction();
  const {
    balance: nativeBalance,
    isLoading: isBalanceLoading,
    refresh: refreshNativeBalance,
  } = useNativeBalance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showGasWarning, setShowGasWarning] = useState(false);
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [uniqueId] = useState<string>(uuidv4());

  // Minimum recommended balance in MON (0.5 MON should be enough for deployment)
  const MIN_GAS_BALANCE = 0.5;

  // Effect to check gas balance
  useEffect(() => {
    if (!isBalanceLoading) {
      // Balance check is complete
      setBalanceChecked(true);
      if (nativeBalance) {
        const balanceNum = parseFloat(nativeBalance);
        setShowGasWarning(balanceNum < MIN_GAS_BALANCE);
      }
    }
  }, [nativeBalance, isBalanceLoading]);

  const handleSubmit = async (poolData: any, endTimeUnix: number) => {
    // Set validation visibility to true when submit is attempted
    setShowValidation(true);

    if (!dbUser) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    // Validate required fields
    if (!poolData.name) {
      toast.error("Please enter a pool name");
      return;
    }

    if (!poolData.target_amount || poolData.target_amount <= 0) {
      toast.error("Please enter a valid funding goal");
      return;
    }

    if (!poolData.min_commitment || poolData.min_commitment <= 0) {
      toast.error("Please enter a valid minimum commitment");
      return;
    }

    // Validate required image
    if (!poolData.image_url) {
      toast.error("Please select an image for your pool");
      return;
    }

    // Check if user has enough gas for deployment
    if (parseFloat(nativeBalance) < MIN_GAS_BALANCE) {
      toast.error(
        `Your wallet has ${parseFloat(nativeBalance).toFixed(
          4
        )} MON. Deploying a pool requires at least 0.5 MON to pay for gas.`,
        {
          duration: 6000,
          style: {
            background: "#1E1F25",
            color: "white",
            border: "1px solid rgba(131, 110, 249, 0.3)",
            maxWidth: "400px",
          },
        }
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Use the new createPoolWithDatabase function that handles both blockchain and database operations
      const result = await createPoolWithDatabase(poolData, endTimeUnix);

      if (!result.success) {
        console.error("Error creating pool:", result.error);
        toast.error(result.error || "Failed to create pool");

        // If we have a transaction hash but database failed, show special message
        if (result.txHash) {
          toast.error(
            `Warning: Pool was created on blockchain but database entry failed. Please contact support with your transaction hash: ${result.txHash}`,
            {
              duration: 10000,
              style: {
                background: "#1E1F25",
                color: "white",
                border: "1px solid rgba(255, 100, 100, 0.3)",
              },
            }
          );
          router.push("/");
        }

        return;
      }

      console.log("Pool created successfully:", result.data);
      toast.success("Pool created successfully!");
      router.push(`/pools/${result.data.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    showValidation,
    showGasWarning,
    balanceChecked,
    uniqueId,
    handleSubmit,
    refreshNativeBalance,
  };
};

export default usePoolCreation;
