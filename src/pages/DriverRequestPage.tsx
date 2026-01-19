import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, MessageSquare, Send, Loader2, Clock, CheckCircle, XCircle, Plus, CalendarIcon, Calendar as CalendarIconSolid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverRequest {
  id: string;
  driver_id: string;
  driver_name: string | null;
  request_type: string;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  request_no: string | null;
}

const REQUEST_TYPES = [
  { value: "single_to_double", label: "Single to Double" },
  { value: "double_to_single", label: "Double to Single" },
  { value: "cng_to_hybrid", label: "CNG to Hybrid" },
  { value: "day_off", label: "Day Off" },
  { value: "other", label: "Other" },
];

const MAX_DAY_OFF_PER_DAY = 40;

const DriverRequestPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [requestType, setRequestType] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<number | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchDriverCredentials = async () => {
      if (!user?.id) return;

      try {
        const { data: credentials, error } = await supabase
          .from("driver_credentials")
          .select("driver_id")
          .eq("user_id", user.id)
          .eq("status", "enabled")
          .maybeSingle();

        if (error) throw error;

        if (credentials) {
          setDriverId(credentials.driver_id);
          
          // Try to get driver name from income data
          const { data: incomeData } = await supabase
            .from("driver_income")
            .select("driver_name")
            .eq("driver_id", credentials.driver_id)
            .limit(1)
            .maybeSingle();
          
          if (incomeData?.driver_name) {
            setDriverName(incomeData.driver_name);
          }
        }
      } catch (error: any) {
        console.error("Error fetching driver credentials:", error);
      }
    };

    fetchDriverCredentials();
  }, [user?.id]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!driverId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("driver_requests")
          .select("*")
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRequests(data || []);
      } catch (error: any) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [driverId]);

  // Fetch available day off slots and check for existing request when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || requestType !== "day_off") {
        setAvailableSlots(null);
        setHasExistingRequest(false);
        return;
      }

      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "dd MMM yyyy");
        const subjectPattern = `Day Off Request - ${dateStr}`;
        
        // Check total approved day off requests for this specific day off date (from subject)
        const { data: approvedRequests, error } = await supabase
          .from("driver_requests")
          .select("id, subject")
          .eq("request_type", "day_off")
          .eq("status", "approved")
          .ilike("subject", `%${dateStr}%`);

        if (error) {
          console.error("Error fetching day off count:", error);
          setAvailableSlots(null);
        } else {
          const count = approvedRequests?.length || 0;
          setAvailableSlots(MAX_DAY_OFF_PER_DAY - count);
        }

        // Check if current driver already has a request for this specific day off date
        if (driverId) {
          const { data: existingRequests, error: existingError } = await supabase
            .from("driver_requests")
            .select("id, subject")
            .eq("driver_id", driverId)
            .eq("request_type", "day_off")
            .ilike("subject", `%${dateStr}%`);

          if (existingError) {
            console.error("Error checking existing request:", existingError);
            setHasExistingRequest(false);
          } else {
            setHasExistingRequest((existingRequests?.length || 0) > 0);
          }
        }
      } catch (error) {
        console.error("Error fetching available slots:", error);
        setAvailableSlots(null);
        setHasExistingRequest(false);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, requestType, driverId]);

  const handleClose = () => {
    navigate("/driver-portal");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverId) {
      toast.error("Driver ID not found");
      return;
    }

    if (!requestType) {
      toast.error("Please select a request type");
      return;
    }

    // For day off requests, validate date and check availability
    let shouldAutoApprove = false;
    if (requestType === "day_off") {
      if (!selectedDate) {
        toast.error("Please select a date for your day off");
        return;
      }

      const dateStr = format(selectedDate, "dd MMM yyyy");
      
      // Check total approved day off requests for this specific day off date
      const { data: approvedRequests, error: countError } = await supabase
        .from("driver_requests")
        .select("id")
        .eq("request_type", "day_off")
        .eq("status", "approved")
        .ilike("subject", `%${dateStr}%`);

      if (countError) {
        console.error("Error checking day off count:", countError);
        toast.error("Failed to check availability. Please try again.");
        return;
      }
      
      const currentCount = approvedRequests?.length || 0;
      if (currentCount >= MAX_DAY_OFF_PER_DAY) {
        toast.error(`Maximum ${MAX_DAY_OFF_PER_DAY} day off requests allowed per day. Please select another date.`);
        return;
      }
      
      // Auto-approve if under the limit
      shouldAutoApprove = true;
    }

    setSubmitting(true);

    const requestLabel = REQUEST_TYPES.find(t => t.value === requestType)?.label || requestType;
    const subject = requestType === "day_off" && selectedDate 
      ? `Day Off Request - ${format(selectedDate, "dd MMM yyyy")}`
      : requestLabel;
    const description = requestType === "day_off" && selectedDate
      ? `Requesting day off on ${format(selectedDate, "EEEE, dd MMMM yyyy")}`
      : `Request for ${requestLabel}`;

    try {
      const insertData: any = {
        driver_id: driverId,
        driver_name: driverName,
        request_type: requestType,
        subject: subject,
        description: description,
      };

      // Calculate remaining slots for notification
      let remainingSlots = 0;
      
      // Auto-approve day off requests if under limit
      if (shouldAutoApprove) {
        insertData.status = "approved";
        insertData.admin_response = "Auto-approved: Day off slot available";
        insertData.responded_at = new Date().toISOString();
        
        // Calculate remaining slots (current approved count was checked earlier)
        const dateStr = format(selectedDate!, "dd MMM yyyy");
        const { data: approvedRequests } = await supabase
          .from("driver_requests")
          .select("id")
          .eq("request_type", "day_off")
          .eq("status", "approved")
          .ilike("subject", `%${dateStr}%`);
        
        remainingSlots = MAX_DAY_OFF_PER_DAY - (approvedRequests?.length || 0) - 1; // -1 for current request
      }

      const { data, error } = await supabase
        .from("driver_requests")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      setRequestType("");
      setSelectedDate(undefined);
      setShowForm(false);
      
      if (shouldAutoApprove && selectedDate) {
        toast.success(`Day off request auto-approved! ✅ (${remainingSlots} slots remaining)`);
        
        // Send push notification (fire and forget)
        supabase.functions.invoke("send-day-off-notification", {
          body: {
            driverId: driverId,
            dayOffDate: format(selectedDate, "dd MMM yyyy"),
            remainingSlots: remainingSlots
          }
        }).catch(err => {
          console.log("Push notification failed (non-critical):", err);
        });
      } else {
        toast.success("Request submitted successfully");
      }
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  // Get tomorrow's date as the minimum selectable date
  const tomorrow = addDays(startOfDay(new Date()), 1);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500 text-white">
            <Loader2 className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRequestTypeLabel = (value: string) => {
    return REQUEST_TYPES.find(t => t.value === value)?.label || value;
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const resolvedCount = requests.filter(r => r.status !== "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/50 to-cyan-100/50 p-4 sm:p-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Portal</span>
      </Button>

      <div className="max-w-4xl mx-auto pt-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">Requests</h1>
          </div>
          {!showForm && driverId && (
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading requests...</span>
          </div>
        ) : !driverId ? (
          <Card className="bg-amber-50 border border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-amber-700">
                <XCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Driver Account Not Found</h3>
                  <p className="text-sm mt-1">Your account is not linked to a driver profile. Please contact an administrator to set up your driver credentials.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* New Request Form */}
            {showForm && (
              <Card className="bg-card border border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    Submit New Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="request-type">Request Type</Label>
                      <Select value={requestType} onValueChange={(value) => {
                        setRequestType(value);
                        if (value !== "day_off") {
                          setSelectedDate(undefined);
                        }
                      }}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {REQUEST_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Picker for Day Off */}
                    {requestType === "day_off" && (
                      <div>
                        <Label>Select Day Off Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full mt-1 justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-background border border-border z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => date < tomorrow}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {/* Availability Counter */}
                        {selectedDate && (
                          <div className={cn(
                            "mt-2 p-3 rounded-lg border",
                            loadingSlots ? "bg-muted/50 border-border" :
                            hasExistingRequest ? "bg-red-50 border-red-200" :
                            availableSlots !== null && availableSlots > 20 ? "bg-green-50 border-green-200" :
                            availableSlots !== null && availableSlots > 10 ? "bg-yellow-50 border-yellow-200" :
                            availableSlots !== null && availableSlots > 0 ? "bg-orange-50 border-orange-200" :
                            "bg-red-50 border-red-200"
                          )}>
                            {loadingSlots ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Checking availability...</span>
                              </div>
                            ) : hasExistingRequest ? (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-medium text-red-700">
                                  You already have a day off request for this date
                                </span>
                              </div>
                            ) : availableSlots !== null ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {format(selectedDate, "dd MMM yyyy")}
                                </span>
                                <Badge className={cn(
                                  availableSlots > 20 ? "bg-green-500" :
                                  availableSlots > 10 ? "bg-yellow-500" :
                                  availableSlots > 0 ? "bg-orange-500" :
                                  "bg-red-500",
                                  "text-white"
                                )}>
                                  {availableSlots > 0 
                                    ? `${availableSlots} slots available` 
                                    : "No slots available"}
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Only future dates are available. Only 1 day off request per driver per day.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setRequestType("");
                          setSelectedDate(undefined);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || !requestType || (requestType === "day_off" && (!selectedDate || availableSlots === 0 || hasExistingRequest))}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Request
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{pendingCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Resolved</p>
                    <p className="text-2xl font-bold text-green-800">{resolvedCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
              <Card className="bg-card border border-border">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Requests Yet</h2>
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any requests. Click "New Request" to get started.
                  </p>
                  <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-3 mt-4">
                  {requests.map((request) => (
                    <RequestCard key={request.id} request={request} getStatusBadge={getStatusBadge} formatDate={formatDate} getRequestTypeLabel={getRequestTypeLabel} />
                  ))}
                </TabsContent>
                
                <TabsContent value="pending" className="space-y-3 mt-4">
                  {requests.filter(r => r.status === "pending").map((request) => (
                    <RequestCard key={request.id} request={request} getStatusBadge={getStatusBadge} formatDate={formatDate} getRequestTypeLabel={getRequestTypeLabel} />
                  ))}
                </TabsContent>
                
                <TabsContent value="resolved" className="space-y-3 mt-4">
                  {requests.filter(r => r.status !== "pending").map((request) => (
                    <RequestCard key={request.id} request={request} getStatusBadge={getStatusBadge} formatDate={formatDate} getRequestTypeLabel={getRequestTypeLabel} />
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface RequestCardProps {
  request: DriverRequest;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (date: string) => string;
  getRequestTypeLabel: (value: string) => string;
}

const RequestCard = ({ request, getStatusBadge, formatDate, getRequestTypeLabel }: RequestCardProps) => {
  // Extract day off date from subject if it's a day off request
  const getDayOffDate = () => {
    if (request.request_type !== "day_off") return null;
    // Subject format: "Day Off Request - 20 Jan 2026"
    const match = request.subject.match(/Day Off Request - (.+)/);
    return match ? match[1] : null;
  };

  const dayOffDate = getDayOffDate();

  return (
    <Card className="bg-card border border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground">
                {request.request_type === "day_off" ? "Day Off Request" : request.subject}
              </CardTitle>
              {request.request_no && (
                <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700">
                  {request.request_no}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {getRequestTypeLabel(request.request_type)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Submitted: {formatDate(request.created_at)}
              </span>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Day Off Date Display */}
        {request.request_type === "day_off" && dayOffDate && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <CalendarIconSolid className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">Requested Day Off</p>
              <p className="text-sm font-semibold text-purple-800">{dayOffDate}</p>
            </div>
          </div>
        )}

        {request.request_type !== "day_off" && (
          <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
        )}
        
        {request.admin_response && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-xs font-medium text-blue-700 mb-1">Admin Response:</p>
            <p className="text-sm text-blue-900">{request.admin_response}</p>
            {request.responded_at && (
              <p className="text-xs text-blue-600 mt-2">
                Responded on {formatDate(request.responded_at)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverRequestPage;
