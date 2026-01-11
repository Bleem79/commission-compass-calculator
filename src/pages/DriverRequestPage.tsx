import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, MessageSquare, Send, Loader2, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

const REQUEST_TYPES = [
  { value: "leave", label: "Leave Request" },
  { value: "schedule", label: "Schedule Change" },
  { value: "vehicle", label: "Vehicle Issue" },
  { value: "payment", label: "Payment Query" },
  { value: "document", label: "Document Request" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
];

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
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

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

  const handleClose = () => {
    navigate("/driver-portal");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverId) {
      toast.error("Driver ID not found");
      return;
    }

    if (!requestType || !subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("driver_requests")
        .insert({
          driver_id: driverId,
          driver_name: driverName,
          request_type: requestType,
          subject: subject.trim(),
          description: description.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      setRequestType("");
      setSubject("");
      setDescription("");
      setShowForm(false);
      toast.success("Request submitted successfully");
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

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
          {!showForm && (
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
                      <Select value={requestType} onValueChange={setRequestType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent>
                          {REQUEST_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief subject of your request"
                        className="mt-1"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide detailed information about your request..."
                        className="mt-1 min-h-[120px]"
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {description.length}/1000 characters
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || !requestType || !subject.trim() || !description.trim()}
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

const RequestCard = ({ request, getStatusBadge, formatDate, getRequestTypeLabel }: RequestCardProps) => (
  <Card className="bg-card border border-border hover:shadow-md transition-shadow">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            {request.subject}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getRequestTypeLabel(request.request_type)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(request.created_at)}
            </span>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>
    </CardHeader>
    <CardContent className="pt-2">
      <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
      
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

export default DriverRequestPage;
