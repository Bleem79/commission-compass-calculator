import React from "react";
import { Search, Filter, X, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequestTypes } from "@/hooks/useRequestTypes";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface AdminRequestsFiltersProps {
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  controllerFilter: string;
  controllerList: string[];
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onControllerChange: (v: string) => void;
  onClearAll: () => void;
  onManageTypes: () => void;
  hasActiveFilters: boolean;
}

export const AdminRequestsFilters = ({
  searchQuery, statusFilter, typeFilter, controllerFilter,
  controllerList, onSearchChange, onStatusChange, onTypeChange,
  onControllerChange, onClearAll, onManageTypes, hasActiveFilters,
}: AdminRequestsFiltersProps) => {
  const { requestTypes } = useRequestTypes();

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by driver ID, name, subject, or request no..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-full md:w-[220px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Request Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {requestTypes.map((type: { value: string; label: string }) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={controllerFilter} onValueChange={onControllerChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Controller" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Controllers</SelectItem>
              {controllerList.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onManageTypes}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Types
          </Button>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center justify-end mt-3">
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3 mr-1" />
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
