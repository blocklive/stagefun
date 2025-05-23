import React from "react";

type TabItem = {
  id: string;
  label: string;
};

interface TabComponentProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabComponent({
  tabs,
  activeTab,
  onTabChange,
}: TabComponentProps) {
  return (
    <div className="border-b border-gray-800">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-8 py-4 text-xl font-medium transition-colors relative flex-shrink-0 ${
              activeTab === tab.id
                ? "text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#836EF9]"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
