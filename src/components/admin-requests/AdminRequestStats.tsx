import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsData {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  dayOff: number;
}

interface AdminRequestStatsProps {
  stats: StatsData;
}

export const AdminRequestStats = ({ stats }: AdminRequestStatsProps) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Total Requests</div>
        <div className="text-2xl font-bold text-foreground">{stats.total}</div>
      </CardContent>
    </Card>
    <Card className="bg-yellow-50 border-yellow-200">
      <CardContent className="p-4">
        <div className="text-sm text-yellow-700">Pending</div>
        <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
      </CardContent>
    </Card>
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="text-sm text-blue-700">In Progress</div>
        <div className="text-2xl font-bold text-blue-800">{stats.inProgress}</div>
      </CardContent>
    </Card>
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-4">
        <div className="text-sm text-green-700">Resolved</div>
        <div className="text-2xl font-bold text-green-800">{stats.resolved}</div>
      </CardContent>
    </Card>
    <Card className="bg-purple-50 border-purple-200">
      <CardContent className="p-4">
        <div className="text-sm text-purple-700">Day Off</div>
        <div className="text-2xl font-bold text-purple-800">{stats.dayOff}</div>
      </CardContent>
    </Card>
  </div>
);
