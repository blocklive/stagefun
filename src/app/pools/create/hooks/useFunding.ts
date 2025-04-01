import { useState } from "react";

export const useFunding = () => {
  const [fundingGoal, setFundingGoal] = useState("");
  const [capAmount, setCapAmount] = useState(""); // Empty initially, will be set based on user choices
  const [currency] = useState("USDC");

  return {
    fundingGoal,
    capAmount,
    currency,
    setFundingGoal,
    setCapAmount,
  };
};

export default useFunding;
