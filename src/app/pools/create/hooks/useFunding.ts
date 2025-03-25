import { useState } from "react";

export const useFunding = () => {
  const [fundingGoal, setFundingGoal] = useState("");
  const [capAmount, setCapAmount] = useState("0"); // Default to 0 for no cap
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
