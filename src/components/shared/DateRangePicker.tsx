import React from "react";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onChange: (range: { from?: Date; to?: Date }) => void;
  className?: string;
  label?: string;
}

/**
 * From / To date range picker built on the shadcn Popover + Calendar pair.
 * The From calendar refuses anything after the chosen To date and vice versa,
 * so an inverted range can never be selected.
 */
export const DateRangePicker = ({
  from,
  to,
  onChange,
  className,
  label = "Filter by date",
}: DateRangePickerProps) => {
  const triggerClass = (hasValue: boolean) =>
    cn(
      "w-full sm:w-[170px] justify-start text-left font-normal min-h-11 border-amber-300 bg-white hover:bg-amber-50",
      !hasValue && "text-muted-foreground"
    );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{label}</p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={triggerClass(!!from)}>
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              {from ? format(from, "dd MMM yyyy") : <span>From date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={from}
              onSelect={(d) => onChange({ from: d, to })}
              disabled={(date) => (to ? isSameDay(date, to) || date > to : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="hidden sm:inline text-xs text-amber-700">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={triggerClass(!!to)}>
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              {to ? format(to, "dd MMM yyyy") : <span>To date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={to}
              onSelect={(d) => onChange({ from, to: d })}
              disabled={(date) => (from ? isSameDay(date, from) || date < from : false)}
              numberOfMonths={1}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ from: undefined, to: undefined })}
            className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 min-h-11 sm:min-h-0"
          >
            <X className="h-3 w-3 mr-1" />
            Clear dates
          </Button>
        )}
      </div>
    </div>
  );
};
