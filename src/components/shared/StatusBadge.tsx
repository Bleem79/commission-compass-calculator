import { Clock, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StatusType = "pending" | "approved" | "rejected" | "in_progress" | string;

interface StatusConfig {
  color: string;
  label: string;
  icon: React.ReactNode;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  pending: {
    color: "bg-yellow-500",
    label: "Pending",
    icon: <Clock className="h-3 w-3 mr-1" />,
  },
  approved: {
    color: "bg-green-500",
    label: "Approved",
    icon: <CheckCircle className="h-3 w-3 mr-1" />,
  },
  rejected: {
    color: "bg-red-500",
    label: "Rejected",
    icon: <XCircle className="h-3 w-3 mr-1" />,
  },
  in_progress: {
    color: "bg-blue-500",
    label: "In Progress",
    icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
  },
};

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  className?: string;
}

/**
 * Reusable status badge component with consistent styling across the app.
 */
export const StatusBadge = ({
  status,
  showIcon = true,
  className,
}: StatusBadgeProps) => {
  const config = STATUS_CONFIGS[status] || {
    color: "bg-gray-500",
    label: status,
    icon: <AlertCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <Badge className={`${config.color} text-white ${className || ""}`}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "approved", label: "Approved", color: "bg-green-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
];
