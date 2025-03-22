import { useState } from "react";

export const useFunding = () => {
  const [fundingGoal, setFundingGoal] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [currency] = useState("USDC");

  return {
    fundingGoal,
    minCommitment,
    currency,
    setFundingGoal,
    setMinCommitment,
  };
};

export default useFunding;
