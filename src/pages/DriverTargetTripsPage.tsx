import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Target, TrendingUp, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TargetTrip {
  id: string;
  driver_id: string;
  driver_name: string | null;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
  created_at: string;
}

const DriverTargetTripsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [targetTrips, setTargetTrips] = useState<TargetTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

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
        }
      } catch (error: any) {
        console.error("Error fetching driver credentials:", error);
      }
    };

    fetchDriverCredentials();
  }, [user?.id]);

  useEffect(() => {
    const fetchTargetTrips = async () => {
      if (!driverId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("target_trips")
          .select("*")
          .eq("driver_id", driverId)
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (error) throw error;

        setTargetTrips(data || []);
      } catch (error: any) {
        console.error("Error fetching target trips:", error);
        toast.error("Failed to load target trips");
      } finally {
        setLoading(false);
      }
    };

    fetchTargetTrips();
  }, [driverId]);

  const handleClose = () => {
    navigate("/driver-portal");
  };

  const getProgressPercentage = (completed: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(Math.round((completed / target) * 100), 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBadge = (completed: number, target: number) => {
    const percentage = getProgressPercentage(completed, target);
    if (percentage >= 100) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Achieved
        </Badge>
      );
    }
    if (percentage >= 75) {
      return (
        <Badge className="bg-emerald-500 text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          On Track
        </Badge>
      );
    }
    return (
      <Badge className="bg-orange-500 text-white">
        <AlertCircle className="h-3 w-3 mr-1" />
        Behind
      </Badge>
    );
  };

  // Calculate totals
  const totalTarget = targetTrips.reduce((sum, t) => sum + t.target_trips, 0);
  const totalCompleted = targetTrips.reduce((sum, t) => sum + t.completed_trips, 0);
  const overallPercentage = getProgressPercentage(totalCompleted, totalTarget);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-50/50 to-teal-100/50 p-4 sm:p-6">
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
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-8 w-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-foreground">Target Trips</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading target trips...</span>
          </div>
        ) : targetTrips.length === 0 ? (
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Target Trips</h2>
              <p className="text-muted-foreground">
                No target trips data available yet. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Overall Progress Card */}
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-emerald-100 text-sm">Overall Progress</p>
                    <p className="text-3xl font-bold">{overallPercentage}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-100 text-sm">Completed / Target</p>
                    <p className="text-2xl font-bold">{totalCompleted} / {totalTarget}</p>
                  </div>
                </div>
                <Progress 
                  value={overallPercentage} 
                  className="h-3 bg-emerald-700"
                />
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card border border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <Target className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Target</p>
                    <p className="text-2xl font-bold text-foreground">{totalTarget}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {targetTrips.map((trip) => {
                  const percentage = getProgressPercentage(trip.completed_trips, trip.target_trips);
                  return (
                    <div key={trip.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{trip.month} {trip.year}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {trip.completed_trips} / {trip.target_trips} trips
                          </span>
                          {getStatusBadge(trip.completed_trips, trip.target_trips)}
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-right text-muted-foreground">{percentage}% complete</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverTargetTripsPage;
