"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import showToast from "@/utils/toast";
import React from "react";
import dynamic from "next/dynamic";

// Helper function to format numbers with k/M suffixes
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}k`;
  } else {
    return num.toFixed(2);
  }
};

// Create a client-only component for the numbers display
const TradingNumbers = dynamic(
  () =>
    Promise.resolve(
      ({
        leftPrices,
        rightPrices,
      }: {
        leftPrices: string[];
        rightPrices: string[];
      }) => (
        <>
          {/* Random trading numbers on left */}
          <div className="absolute top-0 left-2 brand-purple text-xs opacity-70 font-mono">
            {leftPrices.map((price, i) => (
              <div key={`left-${i}`} className="flex gap-4">
                <span>{price}</span>
                <span>{(Math.random() * 2 + 0.1).toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* Random trading numbers on right */}
          <div className="absolute top-0 right-2 brand-purple text-xs opacity-70 font-mono text-right">
            {rightPrices.map((price, i) => (
              <div key={`right-${i}`} className="flex gap-4 justify-end">
                <span>{price}</span>
                <span>{(Math.random() * 2 + 0.1).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </>
      )
    ),
  { ssr: false }
);

export default function AccessCodeEntry() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();
  const [accessCode, setAccessCode] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [leftPrices, setLeftPrices] = useState<string[]>([]);
  const [rightPrices, setRightPrices] = useState<string[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSkullHovered, setIsSkullHovered] = useState(false);

  // Add a ref to the first input for focus management
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the first input on mount
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Function to update a random price in both arrays
  const updateRandomPrice = React.useCallback(() => {
    setLeftPrices((prevPrices) => {
      const newPrices = [...prevPrices];

      // Update multiple random prices for more activity
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * newPrices.length);

        // Generate a much more varied price - potentially large numbers
        let newValue: number;
        const range = Math.random();

        if (range < 0.3) {
          // Small numbers (1-100)
          newValue = Math.random() * 100 + 1;
        } else if (range < 0.6) {
          // Medium numbers (100-9999)
          newValue = Math.random() * 9900 + 100;
        } else if (range < 0.85) {
          // Large numbers (10k-999k)
          newValue = Math.random() * 990000 + 10000;
        } else {
          // Very large numbers (1M-10M)
          newValue = Math.random() * 9000000 + 1000000;
        }

        newPrices[randomIndex] = formatNumber(newValue);
      }

      return newPrices;
    });

    setRightPrices((prevPrices) => {
      const newPrices = [...prevPrices];

      // Update multiple random prices for more activity
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * newPrices.length);

        // Generate a much more varied price - potentially large numbers
        let newValue: number;
        const range = Math.random();

        if (range < 0.3) {
          // Small numbers (1-100)
          newValue = Math.random() * 100 + 1;
        } else if (range < 0.6) {
          // Medium numbers (100-9999)
          newValue = Math.random() * 9900 + 100;
        } else if (range < 0.85) {
          // Large numbers (10k-999k)
          newValue = Math.random() * 990000 + 10000;
        } else {
          // Very large numbers (1M-10M)
          newValue = Math.random() * 9000000 + 1000000;
        }

        newPrices[randomIndex] = formatNumber(newValue);
      }

      return newPrices;
    });
  }, []);

  // Random price data for the background charts
  const generateRandomPrices = () => {
    const prices = [];
    for (let i = 0; i < 20; i++) {
      // Generate varied price ranges
      let value: number;
      const range = Math.random();

      if (range < 0.3) {
        // Small numbers (1-100)
        value = Math.random() * 100 + 1;
      } else if (range < 0.6) {
        // Medium numbers (100-9999)
        value = Math.random() * 9900 + 100;
      } else if (range < 0.85) {
        // Large numbers (10k-999k)
        value = Math.random() * 990000 + 10000;
      } else {
        // Very large numbers (1M-10M)
        value = Math.random() * 9000000 + 1000000;
      }

      prices.push(formatNumber(value));
    }
    return prices;
  };

  useEffect(() => {
    setLeftPrices(generateRandomPrices());
    setRightPrices(generateRandomPrices());
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });

      // Update a random value in each price array on 1 out of 5 mouse movements
      if (Math.random() < 0.2) {
        updateRandomPrice();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [updateRandomPrice]);

  // Update prices at regular intervals regardless of mouse movement
  useEffect(() => {
    const timer = setInterval(() => {
      updateRandomPrice();
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [updateRandomPrice]);

  // Add the animation classes dynamically
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(8px); }
        75% { transform: translateX(-8px); }
        100% { transform: translateX(0); }
      }
      .shake-animation {
        animation: shake 0.5s ease-in-out;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .blink-animation {
        animation: blink 1s infinite;
      }
      @keyframes scanline {
        0% { transform: translateY(0); }
        100% { transform: translateY(100vh); }
      }
      .scanline {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(131, 110, 249, 0.1);
        opacity: 0.3;
        animation: scanline 8s linear infinite;
      }
      .terminal {
        position: relative;
        overflow: hidden;
        text-shadow: 0 0 5px rgba(131, 110, 249, 0.5);
      }
      .terminal::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: repeating-linear-gradient(
          transparent 0px,
          rgba(0, 0, 0, 0.05) 1px,
          transparent 2px
        );
        pointer-events: none;
      }
      .pixel-text {
        font-family: monospace;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .logo-container {
        filter: drop-shadow(0 0 10px rgba(131, 110, 249, 0.5));
        transition: all 0.3s ease;
      }
      .logo-container:hover {
        filter: drop-shadow(0 0 15px rgba(131, 110, 249, 1));
      }
      .icon-transition {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .fade-in {
        opacity: 1;
        transform: scale(1);
      }
      .fade-out {
        opacity: 0;
        transform: scale(0.8);
      }
      .brand-purple {
        color: #836EF9;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Redirect authenticated users to pools page
  useEffect(() => {
    // Only check authentication after Privy is ready
    if (ready && authenticated) {
      console.log(
        "User authenticated in AccessCodeEntry, redirecting to pools"
      );
      router.push("/pools");
    }
  }, [authenticated, ready, router]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }

    if (/^[a-zA-Z0-9]$/.test(value) || value === "") {
      const newCode = [...accessCode];
      newCode[index] = value.toUpperCase();
      setAccessCode(newCode);

      // Update random prices on each input change
      updateRandomPrice();

      // Auto-focus the next input when entering a digit, but only for indices 0-4 (not the last input)
      if (value !== "" && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  // Handle paste event
  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").trim();

    // Process any pasted data regardless of which input field was clicked
    if (pastedData.length > 0) {
      // Clean the pasted text (remove spaces, only keep alphanumeric)
      const cleanedPaste = pastedData.replace(/\s/g, "");
      const validChars = cleanedPaste
        .split("")
        .filter((char) => /^[a-zA-Z0-9]$/.test(char))
        .map((char) => char.toUpperCase())
        .slice(0, accessCode.length); // Take at most the number of boxes we have

      // Create a new code array with the pasted characters
      const newCode = Array(accessCode.length).fill("");

      // Fill in the valid characters
      validChars.forEach((char, i) => {
        newCode[i] = char;
      });

      // Update the state with the new code
      setAccessCode(newCode);

      // Update multiple prices on paste for dramatic effect
      for (let i = 0; i < 3; i++) {
        updateRandomPrice();
      }

      // Focus the appropriate input after pasting
      const firstEmptyIndex = newCode.findIndex((c) => c === "");
      if (firstEmptyIndex !== -1) {
        // Focus the first empty box
        const targetInput = document.getElementById(`code-${firstEmptyIndex}`);
        if (targetInput) {
          setTimeout(() => {
            targetInput.focus();
          }, 10);
        }
      } else {
        // All boxes filled, focus the last one
        const lastIndex = accessCode.length - 1;
        const lastInput = document.getElementById(`code-${lastIndex}`);
        if (lastInput) {
          setTimeout(() => {
            lastInput.focus();
          }, 10);
        }
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Update a random price on key presses
    updateRandomPrice();

    if (e.key === "Backspace" && accessCode[index] === "" && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (accessCode.some((digit) => digit === "")) {
      setErrorMessage("Please enter all six digits");
      return;
    }

    setIsSubmitting(true);

    // Update all prices rapidly when submitting for dramatic effect
    const updateInterval = setInterval(updateRandomPrice, 100);

    try {
      const toastId = showToast.loading("Verifying access code...");

      const code = accessCode.join("");
      const response = await fetch("/api/access-code/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      showToast.dismiss(toastId);
      clearInterval(updateInterval); // Stop updating prices

      if (data.success) {
        showToast.remove();
        showToast.success("Access code accepted");
        // Use setTimeout to ensure the toast is visible before login modal appears
        setTimeout(() => {
          // Open Privy login modal with login and signup options
          login();
        }, 500);
      } else {
        setErrorMessage(data.error || "Invalid access code");
        showToast.remove();
        showToast.error(data.error || "Invalid access code");

        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
        }, 500);
      }
    } catch (error) {
      console.error("Error validating access code:", error);
      setErrorMessage("An error occurred. Please try again.");
      showToast.remove();
      showToast.error("An error occurred. Please try again.");
      clearInterval(updateInterval); // Make sure to clear interval on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    // Open Privy login modal in login-only mode (disableSignup true)
    login({ disableSignup: true });
  };

  return (
    <div className="terminal relative min-h-[70vh] px-6 py-12 flex flex-col items-center justify-center">
      {/* Scanline effect */}
      <div className="scanline"></div>

      <TradingNumbers leftPrices={leftPrices} rightPrices={rightPrices} />

      <h1 className="pixel-text text-5xl font-bold text-center mb-12 brand-purple leading-relaxed">
        ENTER
        <br />
        ACCESS CODE
      </h1>

      {/* Code input container */}
      <div
        id="code-container"
        className={`flex space-x-2 mb-8 w-full max-w-sm mx-auto ${
          isShaking ? "shake-animation" : ""
        }`}
      >
        {accessCode.map((digit, index) => (
          <div
            key={index}
            className="w-full h-14 border-2 border-[#836EF9] rounded-lg flex items-center justify-center relative bg-black/30 shadow-[0_0_10px_rgba(131,110,249,0.3)]"
          >
            <input
              id={`code-${index}`}
              ref={index === 0 ? firstInputRef : undefined}
              type="text"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(e, index)}
              maxLength={1}
              className="w-full h-full text-center bg-transparent text-2xl font-mono brand-purple focus:outline-none caret-[#836EF9] z-10 pixel-text"
              autoFocus={index === 0}
            />
            {digit === "" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-6 w-0.5 bg-[#836EF9] blink-animation"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="text-red-500 mb-4 text-center font-mono">
          {errorMessage}
        </div>
      )}

      {/* Submit Button */}
      <div className="w-full max-w-xs mx-auto">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 px-8 rounded-lg border-2 border-[#836EF9] hover:bg-[#836EF9]/10
                    brand-purple font-mono text-xl transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest pixel-text
                    shadow-[0_0_10px_rgba(131,110,249,0.3)]"
        >
          SUBMIT
        </button>
      </div>

      {/* Hacker Skull Icon */}
      <div
        className="absolute bottom-4 right-4 transition-all duration-300 logo-container w-12 h-12 flex items-center justify-center"
        onMouseEnter={() => setIsSkullHovered(true)}
        onMouseLeave={() => setIsSkullHovered(false)}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isSkullHovered ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Pixelated skull SVG */}
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="brand-purple"
          >
            {/* Pixelated skull outline */}
            <path
              d="M8 3H16V4H18V6H19V8H20V14H19V16H18V17H16V18H14V20H10V18H8V17H6V16H5V14H4V8H5V6H6V4H8V3Z"
              stroke="none"
              fill="currentColor"
            />
            {/* Eye holes - square pixel style */}
            <path
              d="M9 9H12V12H9V9Z M14 9H17V12H14V9Z"
              stroke="none"
              fill="black"
            />
            {/* Nose */}
            <path d="M12 13H13V14H12V13Z" stroke="none" fill="black" />
            {/* Teeth row */}
            <path
              d="M9 16H10V17H11V16H12V17H13V16H14V17H15V16H16V17H14V18H10V17H9V16Z"
              stroke="none"
              fill="black"
            />
          </svg>
        </div>

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isSkullHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src="/stagefunheader.png"
            alt="StageFun Logo"
            className="object-contain w-10 h-10"
          />
        </div>
      </div>

      {/* Login notice for existing users */}
      <p className="mt-8 text-gray-400 text-center font-mono text-sm">
        Already have an account?{" "}
        <button
          onClick={handleLogin}
          className="text-[#836EF9] hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  );
}
