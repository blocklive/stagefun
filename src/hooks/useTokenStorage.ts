import { useState, useEffect, useCallback } from "react";
import { Token } from "@/types/token";
import { TOKEN_ICONS } from "@/components/token/TokenIcon";

const CUSTOM_TOKENS_KEY = "customTokens";
const RECENT_TOKENS_KEY = "recentTokens";
const MAX_RECENT_TOKENS = 10;

export function useTokenStorage() {
  const [customTokens, setCustomTokens] = useState<Token[]>([]);
  const [recentTokens, setRecentTokens] = useState<Token[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tokens from localStorage on mount
  useEffect(() => {
    try {
      const savedCustomTokens = localStorage.getItem(CUSTOM_TOKENS_KEY);
      const savedRecentTokens = localStorage.getItem(RECENT_TOKENS_KEY);

      if (savedCustomTokens) {
        setCustomTokens(JSON.parse(savedCustomTokens));
      }

      if (savedRecentTokens) {
        setRecentTokens(JSON.parse(savedRecentTokens));
      }
    } catch (error) {
      console.error("Failed to load tokens from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save custom tokens to localStorage
  const saveCustomTokens = useCallback((tokens: Token[]) => {
    setCustomTokens(tokens);
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(tokens));
  }, []);

  // Save recent tokens to localStorage
  const saveRecentTokens = useCallback((tokens: Token[]) => {
    setRecentTokens(tokens);
    localStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(tokens));
  }, []);

  // Add a new custom token
  const addCustomToken = useCallback((token: Token) => {
    setCustomTokens((prevTokens) => {
      // Check if token already exists
      const existingToken = prevTokens.find(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );
      if (existingToken) return prevTokens;

      // Add source and isCustom flags
      const newToken = { ...token, source: "custom" as const, isCustom: true };
      const updatedTokens = [...prevTokens, newToken];
      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updatedTokens));
      return updatedTokens;
    });
  }, []);

  // Remove a custom token
  const removeCustomToken = useCallback((address: string) => {
    setCustomTokens((prevTokens) => {
      const updatedTokens = prevTokens.filter(
        (token) => token.address.toLowerCase() !== address.toLowerCase()
      );
      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updatedTokens));
      return updatedTokens;
    });
  }, []);

  // Add a token to recent tokens
  const addRecentToken = useCallback((token: Token) => {
    setRecentTokens((prevTokens) => {
      // Remove token if it already exists
      const filteredTokens = prevTokens.filter(
        (t) => t.address.toLowerCase() !== token.address.toLowerCase()
      );

      // Apply proper icon for known tokens
      // or make sure we don't store generic-token.svg references
      let properLogoURI = token.logoURI;

      // Use known token icons for any tokens with symbols in our TOKEN_ICONS map
      if (token.symbol && TOKEN_ICONS[token.symbol]) {
        properLogoURI = TOKEN_ICONS[token.symbol];
      }
      // Don't preserve generic token icon paths
      else if (properLogoURI && properLogoURI.includes("generic-token")) {
        properLogoURI = undefined;
      }

      // Add token with updated timestamp and source
      const updatedToken = {
        ...token,
        logoURI: properLogoURI,
        lastUsed: Date.now(),
        source: "recent" as const,
      };

      // Add to the beginning of the array and limit to MAX_RECENT_TOKENS
      const updatedTokens = [updatedToken, ...filteredTokens].slice(
        0,
        MAX_RECENT_TOKENS
      );
      localStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(updatedTokens));
      return updatedTokens;
    });
  }, []);

  // Clear all recent tokens
  const clearRecentTokens = useCallback(() => {
    setRecentTokens([]);
    localStorage.removeItem(RECENT_TOKENS_KEY);
  }, []);

  return {
    customTokens,
    recentTokens,
    isLoaded,
    addCustomToken,
    removeCustomToken,
    addRecentToken,
    clearRecentTokens,
    saveCustomTokens,
    saveRecentTokens,
  };
}
