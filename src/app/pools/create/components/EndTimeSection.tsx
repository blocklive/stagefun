import React from "react";

interface EndTimeSectionProps {
  endDateInputValue: string;
  onEndDateChange: (value: string) => void;
}

// Helper function to format a date for datetime-local input
function formatDateForInput(date: Date): string {
  // Get the local ISO string (which includes the timezone offset)
  const localISOString = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .substring(0, 16);

  return localISOString;
}

export const EndTimeSection: React.FC<EndTimeSectionProps> = ({
  endDateInputValue,
  onEndDateChange,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">End Time</h2>
      <div className="flex gap-4">
        <input
          type="datetime-local"
          value={endDateInputValue}
          min={formatDateForInput(new Date())}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
        />
      </div>
      <p className="text-sm text-gray-400 mt-2">
        Set when your party round will end. After this time, no new commitments
        will be accepted.
      </p>
    </div>
  );
};

export default EndTimeSection;
