import React, { useState } from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<"producer" | "patron">("producer");

  if (!isOpen) return null;

  const producerSteps = [
    {
      title: "Open a party round",
      description:
        "Stage.fun is a platform that allows users to launch and participate in investment rounds for live events and other services with real world cash flows.",
    },
    {
      title: "Close your round",
      description:
        "Invite patrons to support. You'll have until the end date to close your financing before it's cancelled and cash is returned.",
    },
    {
      title: "Pool is created",
      description:
        "Upon successful close you'll be able to withdraw cash to produce your event. Patrons will receive a tradable token redeemable for yield based on your revenue.",
    },
    {
      title: "Deliver your event",
      description:
        "Don't forget to reward your early supporters onsite. We recommend using Blocklive to easily token gate rewards for patrons.",
    },
  ];

  const patronSteps = [
    {
      title: "Commit to a round",
      description:
        "Find an event or venue you'd like to support and commit USDC.",
    },
    {
      title: "Receive your tokens",
      description:
        "A token will be dropped automatically into your wallet 1:1 with your commitment.",
    },
    {
      title: "Trade or hold",
      description: "The token and any rights attached can be traded or held.",
    },
    {
      title: "Go to the events",
      description:
        "Show up and enjoy the benefits, you earned it for supporting early. After the event is completed you will be paid back yield based on your patronage.",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#000000] w-full max-w-md rounded-[16px] p-6 border border-gray-800">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">How it works</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("producer")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium ${
              activeTab === "producer"
                ? "bg-white text-black"
                : "bg-[#FFFFFF14] text-white"
            }`}
          >
            Producer
          </button>
          <button
            onClick={() => setActiveTab("patron")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium ${
              activeTab === "patron"
                ? "bg-white text-black"
                : "bg-[#FFFFFF14] text-white"
            }`}
          >
            Patron
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 min-h-[450px]">
          {activeTab === "producer" ? (
            <div className="space-y-6">
              {producerSteps.map((step, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-[#FFFFFF14] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-medium">{index + 1}</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-white font-medium mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {patronSteps.map((step, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-[#FFFFFF14] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-medium">{index + 1}</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-white font-medium mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
