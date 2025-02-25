"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  FaHome,
  FaEnvelope,
  FaBell,
  FaCompass,
  FaPlus,
  FaUserAlt,
} from "react-icons/fa";

export default function PoolsPage() {
  const { logout } = usePrivy();

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-700">
        <FaPlus className="text-xl" />
        <FaUserAlt className="text-xl" />
      </header>

      {/* Header Title */}
      <h1 className="text-center text-xl mt-4">PARTY ROUNDS</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mt-4">
        <button className="bg-gray-800 px-4 py-2 rounded-full">
          Open rounds
        </button>
        <button className="bg-gray-800 px-4 py-2 rounded-full">
          My rounds
        </button>
      </div>

      {/* List of Items */}
      <div className="flex-1 overflow-y-auto mt-4">
        <ul>
          <li className="p-4 border-b border-gray-700">
            1X Technologies - Matt Hill
          </li>
          <li className="p-4 border-b border-gray-700">
            LILIES - Mia Anderson
          </li>
          <li className="p-4 border-b border-gray-700">
            kotopia - Lucas Wilson
          </li>
        </ul>
      </div>

      {/* Navigation Bar */}
      <nav className="flex justify-around items-center p-4 bg-gray-800">
        <FaHome className="text-xl" />
        <FaEnvelope className="text-xl" />
        <FaBell className="text-xl" />
        <FaCompass className="text-xl" />
      </nav>
    </div>
  );
}
