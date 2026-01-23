import { startOfDay, setDate, addMonths, subMonths, isBefore, isAfter, format } from "date-fns";

/**
 * Get the billing cycle range (26th to 25th) for a given date.
 */
export const getBillingCycleRange = (date: Date) => {
  const day = date.getDate();
  let cycleStart: Date;
  let cycleEnd: Date;

  if (day >= 26) {
    // Current month 26th to next month 25th
    cycleStart = setDate(date, 26);
    cycleEnd = setDate(addMonths(date, 1), 25);
  } else {
    // Previous month 26th to current month 25th
    cycleStart = setDate(subMonths(date, 1), 26);
    cycleEnd = setDate(date, 25);
  }

  return { start: startOfDay(cycleStart), end: startOfDay(cycleEnd) };
};

/**
 * Check if a date falls within a billing cycle.
 */
export const isDateInCycle = (date: Date, cycle: { start: Date; end: Date }): boolean => {
  const reqDay = startOfDay(date);
  return (
    (isAfter(reqDay, cycle.start) || reqDay.getTime() === cycle.start.getTime()) &&
    (isBefore(reqDay, cycle.end) || reqDay.getTime() === cycle.end.getTime())
  );
};

/**
 * Extract day off date from request subject (format: "Day Off Request - DD MMM YYYY").
 */
export const extractDayOffDate = (subject: string): string | null => {
  const match = subject.match(/Day Off Request - (\d{1,2} \w+ \d{4})/);
  if (match) {
    try {
      const parsedDate = new Date(match[1]);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, "yyyy-MM-dd");
      }
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Format a date string for display.
 */
export const formatDateDisplay = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
