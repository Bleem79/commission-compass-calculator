import React from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MAX_DAY_OFF_PER_CYCLE } from "@/constants/requestTypes";
import { getMinDayOffDate } from "@/hooks/useDayOffValidation";
import { useRequestTypes } from "@/hooks/useRequestTypes";

interface DriverRequestFormProps {
  requestType: string;
  selectedDate: Date | undefined;
  onRequestTypeChange: (value: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  availableSlots: number | null;
  loadingSlots: boolean;
  hasExistingRequest: boolean;
  cycleRequestCount: number;
  cycleRange: { start: Date; end: Date } | null;
  canSubmit: boolean;
}

export const DriverRequestForm = ({
  requestType,
  selectedDate,
  onRequestTypeChange,
  onDateChange,
  onSubmit,
  onCancel,
  submitting,
  availableSlots,
  loadingSlots,
  hasExistingRequest,
  cycleRequestCount,
  cycleRange,
  canSubmit,
}: DriverRequestFormProps) => {
  const tomorrow = getMinDayOffDate();
  const remainingCycleRequests = MAX_DAY_OFF_PER_CYCLE - cycleRequestCount;

  const { requestTypes: availableTypes } = useRequestTypes();

  return (
    <Card className="mb-6 bg-card border-border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">New Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select value={requestType} onValueChange={onRequestTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requestType === "day_off" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Day Off Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "EEEE, dd MMMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={onDateChange}
                      disabled={(date) => date < tomorrow}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking availability...
                    </div>
                  ) : (
                    <>
                      {availableSlots !== null && (
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full",
                            availableSlots > 10
                              ? "bg-green-100 text-green-700"
                              : availableSlots > 0
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {availableSlots} slots available
                        </span>
                      )}
                      {hasExistingRequest && (
                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                          You already requested this date
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {cycleRange && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">
                    Billing Cycle: {format(cycleRange.start, "dd MMM")} -{" "}
                    {format(cycleRange.end, "dd MMM yyyy")}
                  </p>
                  <p className={cn(remainingCycleRequests <= 0 ? "text-red-500" : "text-foreground")}>
                    Day off requests remaining: {remainingCycleRequests}/{MAX_DAY_OFF_PER_CYCLE}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={submitting || !requestType || (requestType === "day_off" && !canSubmit)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
