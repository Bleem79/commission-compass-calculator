const dubaiDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
});

export const DAILY_REQUEST_LIMIT_MESSAGE =
  "You have already submitted a request today. Only one request per day is allowed, regardless of type. Please try again after midnight Dubai time.";

export function dubaiSubmissionDay(value: string | Date): string {
  return dubaiDayFormatter.format(new Date(value));
}

export function hasDailyRequest(
  requests: ReadonlyArray<{ created_at: string }>,
  now: Date = new Date(),
): boolean {
  const today = dubaiSubmissionDay(now);
  return requests.some((request) => dubaiSubmissionDay(request.created_at) === today);
}