import React from "react";

interface CountdownTimerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
}

/**
 * A responsive countdown timer component that adapts to different screen sizes.
 * On screens under 430px, the time boxes appear below the "Time left" heading.
 */
const CountdownTimer: React.FC<CountdownTimerProps> = ({
  days,
  hours,
  minutes,
  seconds,
  className = "",
}) => {
  return (
    <div className={`bg-[#FFFFFF0A] p-4 rounded-[16px] ${className}`}>
      {/* Custom responsive layout with the 'xs' breakpoint at 430px */}
      <div className="flex flex-col items-start justify-between xs:flex-row xs:items-center">
        <h2 className="text-xl font-semibold mb-3 xs:mb-0">Time left</h2>
        <div className="flex space-x-2 w-full justify-center xs:w-auto xs:justify-end">
          <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
            <div className="text-2xl font-bold">{days}</div>
          </div>
          <div className="text-xl font-bold flex items-center">:</div>
          <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
            <div className="text-2xl font-bold">{hours}</div>
          </div>
          <div className="text-xl font-bold flex items-center">:</div>
          <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
            <div className="text-2xl font-bold">{minutes}</div>
          </div>
          <div className="text-xl font-bold flex items-center">:</div>
          <div className="bg-[#FFFFFF0F] px-4 py-2 rounded-[12px] text-center">
            <div className="text-2xl font-bold">{seconds}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
