import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaTelegram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full pt-0 pb-10 -mt-20">
      <div className="max-w-screen-xl mx-auto px-4 flex flex-col items-center">
        {/* Logo on top */}
        <div className="mb-2">
          <Image
            src="/stagefunheader.png"
            alt="Stage Fun Logo"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>

        {/* Links with glow effect */}
        <div className="flex items-center justify-center gap-8 my-1">
          <Link
            href="https://x.com/stagedotfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-all duration-300 hover:text-[#836EF9] relative"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="absolute w-full h-full rounded-full opacity-0 hover:opacity-100 transition-opacity"
              style={{ boxShadow: "0 0 15px 5px #836EF9", zIndex: "-1" }}
            ></span>
            <FaTwitter size={20} />
          </Link>

          <Link
            href="https://t.me/+obehJGswLfI3NWE0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-all duration-300 hover:text-[#836EF9] relative"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="absolute w-full h-full rounded-full opacity-0 hover:opacity-100 transition-opacity"
              style={{ boxShadow: "0 0 15px 5px #836EF9", zIndex: "-1" }}
            ></span>
            <FaTelegram size={20} />
          </Link>
        </div>

        {/* Copyright with digital style */}
        <div className="text-gray-500 text-xs tracking-widest font-mono mt-4">
          [ C_2025 ] STAGE.FUN
        </div>
      </div>
    </footer>
  );
}
