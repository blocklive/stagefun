import { useState, useEffect } from "react";

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

export const useEndTime = () => {
  // Default end date is 2 days from now
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() + 2))
  );

  // State to hold the formatted date string for the input
  const [endDateInputValue, setEndDateInputValue] = useState<string>(
    formatDateForInput(endDate)
  );

  // Update the input value whenever endDate changes
  useEffect(() => {
    setEndDateInputValue(formatDateForInput(endDate));
  }, [endDate]);

  const handleEndDateChange = (value: string) => {
    if (value) {
      const selectedDate = new Date(value);
      setEndDate(selectedDate);
      setEndDateInputValue(value);
    }
  };

  return {
    endDate,
    endDateInputValue,
    handleEndDateChange,
  };
};

export default useEndTime;
