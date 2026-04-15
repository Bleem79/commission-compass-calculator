import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient?: string;
  className?: string;
}

/**
 * Reusable stats card component for displaying metrics.
 */
export const StatsCard = ({
  icon,
  label,
  value,
  gradient = "from-blue-500 to-blue-600",
  className,
}: StatsCardProps) => {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white shrink-0", gradient)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
            <p className="text-sm sm:text-2xl font-bold text-foreground break-all leading-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

/**
 * Grid container for StatsCard components.
 */
export const StatsGrid = ({
  children,
  columns = 4,
  className,
}: StatsGridProps) => {
  return (
    <div className={cn("grid gap-4 mb-6", columnClasses[columns], className)}>
      {children}
    </div>
  );
};
