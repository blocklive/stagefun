import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { RegulatoryFramework, SecurityType } from "@/types/investment";
import {
  REGULATORY_FRAMEWORKS,
  SECURITY_TYPES,
} from "@/lib/constants/investment";

interface RegulatoryFrameworkSelectorProps {
  selectedFramework?: RegulatoryFramework;
  onFrameworkChange: (framework: RegulatoryFramework) => void;
  onSecurityTypeChange: (securityType: SecurityType) => void;
}

export const RegulatoryFrameworkSelector: React.FC<
  RegulatoryFrameworkSelectorProps
> = ({ selectedFramework, onFrameworkChange, onSecurityTypeChange }) => {
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState<
    SecurityType | undefined
  >();

  const frameworkDropdownRef = useRef<HTMLDivElement>(null);
  const securityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        frameworkDropdownRef.current &&
        !frameworkDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFrameworkDropdown(false);
      }
      if (
        securityDropdownRef.current &&
        !securityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSecurityDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedFrameworkInfo = selectedFramework
    ? REGULATORY_FRAMEWORKS[selectedFramework]
    : null;
  const selectedSecurityInfo = selectedSecurity
    ? SECURITY_TYPES[selectedSecurity]
    : null;

  const handleFrameworkSelect = (framework: RegulatoryFramework) => {
    onFrameworkChange(framework);
    setShowFrameworkDropdown(false);
  };

  const handleSecuritySelect = (security: SecurityType) => {
    setSelectedSecurity(security);
    onSecurityTypeChange(security);
    setShowSecurityDropdown(false);
  };

  return (
    <div className="space-y-6">
      {/* Regulatory Framework Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Regulatory Framework
        </label>
        <div className="relative" ref={frameworkDropdownRef}>
          <button
            type="button"
            onClick={() => setShowFrameworkDropdown(!showFrameworkDropdown)}
            className="w-full p-3 bg-[#FFFFFF14] rounded-lg text-white border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-[#836EF9] focus:border-transparent flex items-center justify-between"
          >
            <span className="text-left">
              {selectedFrameworkInfo?.label || "Select regulatory framework"}
            </span>
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform ${
                showFrameworkDropdown ? "transform rotate-180" : ""
              }`}
            />
          </button>

          {showFrameworkDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden z-20">
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(REGULATORY_FRAMEWORKS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      handleFrameworkSelect(key as RegulatoryFramework)
                    }
                    className={`w-full p-4 text-left hover:bg-[#FFFFFF0A] transition-colors border-b border-[#FFFFFF1A] last:border-b-0 ${
                      selectedFramework === key
                        ? "bg-[#836EF9]/10 text-[#836EF9]"
                        : "text-white"
                    }`}
                  >
                    <div className="font-medium">{info.label}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {info.description}
                    </div>
                    {info.maxRaise && (
                      <div className="text-xs text-gray-500 mt-1">
                        Max raise: ${(info.maxRaise / 1000000).toFixed(0)}M
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedFrameworkInfo && (
          <p className="text-xs text-gray-500 mt-2">
            {selectedFrameworkInfo.disclosure}
          </p>
        )}
      </div>

      {/* Security Type Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Security Type
        </label>
        <div className="relative" ref={securityDropdownRef}>
          <button
            type="button"
            onClick={() => setShowSecurityDropdown(!showSecurityDropdown)}
            className="w-full p-3 bg-[#FFFFFF14] rounded-lg text-white border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-[#836EF9] focus:border-transparent flex items-center justify-between"
          >
            <span className="text-left">
              {selectedSecurityInfo?.label || "Select security type"}
            </span>
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform ${
                showSecurityDropdown ? "transform rotate-180" : ""
              }`}
            />
          </button>

          {showSecurityDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden z-20">
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(SECURITY_TYPES).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSecuritySelect(key as SecurityType)}
                    className={`w-full p-4 text-left hover:bg-[#FFFFFF0A] transition-colors border-b border-[#FFFFFF1A] last:border-b-0 ${
                      selectedSecurity === key
                        ? "bg-[#836EF9]/10 text-[#836EF9]"
                        : "text-white"
                    }`}
                  >
                    <div className="font-medium">{info.label}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {info.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedSecurityInfo && (
          <p className="text-xs text-gray-500 mt-2">
            {selectedSecurityInfo.description}
          </p>
        )}
      </div>
    </div>
  );
};
