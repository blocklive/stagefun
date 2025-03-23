import { useState } from "react";

export const usePoolDetails = () => {
  const [poolName, setPoolName] = useState("");
  const [ticker, setTicker] = useState("");

  return {
    poolName,
    ticker,
    setPoolName,
    setTicker,
  };
};

export default usePoolDetails;
