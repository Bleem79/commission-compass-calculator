import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { extractDayOffDate } from "@/utils/dateUtils";
import { DriverRequest } from "@/constants/requestTypes";

interface DayOffCalendarProps {
  requests: DriverRequest[];
  calendarMonth: Date;
  selectedDate: string | null;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: string | null) => void;
}

export const DayOffCalendar = ({
  requests,
  calendarMonth,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: DayOffCalendarProps) => {
  // Calculate day off counts per day
  const dayOffCountsByDate = useMemo(() => {
    const counts: Record<string, { total: number; approved: number; pending: number }> = {};

    requests
      .filter((r) => r.request_type === "day_off")
      .forEach((r) => {
        const dateStr = extractDayOffDate(r.subject);
        if (!dateStr) return;

        if (!counts[dateStr]) {
          counts[dateStr] = { total: 0, approved: 0, pending: 0 };
        }
        counts[dateStr].total++;
        if (r.status === "approved") {
          counts[dateStr].approved++;
        } else if (r.status === "pending") {
          counts[dateStr].pending++;
        }
      });

    return counts;
  }, [requests]);

  // Get days in current calendar month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  // Get the starting day of week offset (0 = Sunday)
  const startingDayOffset = useMemo(() => {
    return startOfMonth(calendarMonth).getDay();
  }, [calendarMonth]);

  return (
    <Card className="mb-6 bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Day Off Requests Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(subMonths(calendarMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(calendarMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startingDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}

          {/* Day cells */}
          {calendarDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const counts = dayOffCountsByDate[dateStr];
            const isSelected = selectedDate === dateStr;
            const hasRequests = counts && counts.total > 0;

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(isSelected ? null : dateStr)}
                className={cn(
                  "h-16 p-1 rounded-lg border transition-all",
                  "hover:border-primary/50 hover:bg-accent/50",
                  isToday(day) && "ring-2 ring-primary ring-offset-1",
                  isSelected && "bg-primary/10 border-primary",
                  !isSameMonth(day, calendarMonth) && "opacity-50",
                  hasRequests ? "border-blue-200 bg-blue-50/50" : "border-border"
                )}
              >
                <div className="text-xs font-medium mb-1">{format(day, "d")}</div>
                {hasRequests && (
                  <div className="space-y-0.5">
                    {counts.approved > 0 && (
                      <div className="text-[10px] px-1 rounded bg-green-100 text-green-700">
                        ✓ {counts.approved}
                      </div>
                    )}
                    {counts.pending > 0 && (
                      <div className="text-[10px] px-1 rounded bg-yellow-100 text-yellow-700">
                        ⏳ {counts.pending}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100" />
            <span>Pending</span>
          </div>
        </div>

        {selectedDate && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => onDateSelect(null)}>
              Clear filter: {format(new Date(selectedDate), "dd MMM yyyy")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
