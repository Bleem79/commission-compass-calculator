import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CalendarEvent {
  id: string;
  event_date: string;
  event_name: string;
  address: string | null;
  maps_link: string | null;
}

const DriverCalendarEventsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, event_date, event_name, address, maps_link")
        .order("event_date", { ascending: true });
      if (!mounted) return;
      if (!error) setEvents((data as CalendarEvent[]) || []);
      setLoading(false);
    };
    load();

    // Realtime sync
    const channel = supabase
      .channel("calendar_events_driver")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.event_date) || [];
      arr.push(e);
      map.set(e.event_date, arr);
    });
    return map;
  }, [events]);

  const eventDates = useMemo(
    () => events.map((e) => new Date(e.event_date + "T00:00:00")),
    [events]
  );

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dayEvents = selectedKey ? eventsByDate.get(selectedKey) || [] : [];

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => new Date(e.event_date + "T00:00:00") >= today)
      .slice(0, 5);
  }, [events]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate("/driver-portal")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Portal</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => navigate("/driver-portal")}
            >
              <X className="h-6 w-6" />
            </Button>
          </header>

          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-3">
              <CalendarDays className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Calendar Events</h1>
            <p className="text-white/60 text-sm mt-1">
              Tap a highlighted date to view event details
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/20">
              <CardContent className="p-2 sm:p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ hasEvent: eventDates }}
                  modifiersClassNames={{
                    hasEvent:
                      "relative font-bold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                  }}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            {/* Selected day details */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {selectedDate ? format(selectedDate, "EEEE, dd MMMM yyyy") : "Select a date"}
                  </h2>
                  {dayEvents.length > 0 && (
                    <Badge variant="secondary">
                      {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>

                {loading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Loading events…
                  </p>
                ) : dayEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No events on this date.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {dayEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-lg border border-border p-3 bg-background"
                      >
                        <p className="font-medium text-foreground mb-1">{ev.event_name}</p>
                        {ev.address && (
                          <p className="text-sm text-muted-foreground mb-2 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{ev.address}</span>
                          </p>
                        )}
                        {ev.maps_link ? (
                          <a
                            href={ev.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <MapPin className="w-4 h-4" />
                            Open in Google Maps
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No location provided
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming */}
          {!loading && upcoming.length > 0 && (
            <Card className="mt-6 bg-white/95 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-base font-semibold mb-3">Upcoming events</h3>
                <ul className="divide-y divide-border">
                  {upcoming.map((ev) => {
                    const d = new Date(ev.event_date + "T00:00:00");
                    const isToday = isSameDay(d, new Date());
                    return (
                      <li
                        key={ev.id}
                        className="py-2 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-muted/40 px-2 rounded"
                        onClick={() => setSelectedDate(d)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center w-12">
                            <p className="text-xs text-muted-foreground uppercase">
                              {format(d, "MMM")}
                            </p>
                            <p className="text-lg font-bold leading-none">
                              {format(d, "dd")}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{ev.event_name}</p>
                            {isToday && (
                              <Badge variant="default" className="text-[10px] mt-0.5">
                                Today
                              </Badge>
                            )}
                          </div>
                        </div>
                        {ev.maps_link && (
                          <a
                            href={ev.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-3.5 h-3.5" /> Map
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {!loading && events.length === 0 && (
            <Card className="mt-6 bg-white/95 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center text-muted-foreground">
                No events have been added yet. Check back soon.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverCalendarEventsPage;