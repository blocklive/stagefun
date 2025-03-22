import { useState } from "react";

export const usePoolDetails = () => {
  const [poolName, setPoolName] = useState("");
  const [ticker, setTicker] = useState("");
  const [patrons, setPatrons] = useState("");

  return {
    poolName,
    ticker,
    patrons,
    setPoolName,
    setTicker,
    setPatrons,
  };
};

export default usePoolDetails;
