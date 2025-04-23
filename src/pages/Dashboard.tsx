
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, 
  AlertDialogCancel } from "@/components/ui/alert-dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, Settings, Calendar, BarChart, Layers, Wallet, Percent, RefreshCw, HelpCircle, Fuel, LogOut } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import AdminSettings from "@/components/AdminSettings";

// Commission data as provided
const commissionData = [
  { shiftType: "Single Shift", commissionType: "With Basic", from: 0, to: 199.99, percentage: 0 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 200, to: 224.99, percentage: 5 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 225, to: 249.99, percentage: 10 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 250, to: 269.99, percentage: 15 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 270, to: 299.99, percentage: 20 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 300, to: 339.99, percentage: 25 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 340, to: 379.99, percentage: 30 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 380, to: Infinity, percentage: 35 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 0, to: 174.99, percentage: 5 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 175, to: 209.99, percentage: 10 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 210, to: 224.99, percentage: 15 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 225, to: 239.9, percentage: 20 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 240, to: 274.99, percentage: 25 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 275, to: 299.99, percentage: 30 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 300, to: 324.99, percentage: 32 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 325, to: 384.99, percentage: 35 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 385, to: Infinity, percentage: 38 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 0, to: 149.99, percentage: 0 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 150, to: 169.99, percentage: 5 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 170, to: 189.99, percentage: 10 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 190, to: 204.99, percentage: 15 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 205, to: 224.99, percentage: 20 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 225, to: 254.99, percentage: 25 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 255, to: 284.99, percentage: 30 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 285, to: Infinity, percentage: 35 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 0, to: 134.99, percentage: 5 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 135, to: 149.99, percentage: 10 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 150, to: 164.99, percentage: 15 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 165, to: 179.99, percentage: 20 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 180, to: 204.99, percentage: 25 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 205, to: 224.99, percentage: 30 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 225, to: 244.99, percentage: 32 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 245, to: 284.99, percentage: 35 },
  { shiftType: "Double Shift", commissionType: "With Out Basic", from: 285, to: Infinity, percentage: 38 },
];

const months = [
  "25-Jan", "25-Feb", "25-Mar", "25-Apr", "25-May", "25-Jun",
  "25-Jul", "25-Aug", "25-Sep", "25-Oct", "25-Nov", "25-Dec"
];

type NextTierInfo = { percentage: number; amountNeeded: number };

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [commissionType, setCommissionType] = useState("");
  const [totalIncome, setTotalIncome] = useState<number | undefined>(undefined);
  const [workingDays, setWorkingDays] = useState<number | undefined>(undefined);
  const [averageDailyIncome, setAverageDailyIncome] = useState<number | undefined>(undefined);
  const [commissionPercentage, setCommissionPercentage] = useState<number | undefined>(undefined);
  const [nextTierInfo, setNextTierInfo] = useState<NextTierInfo[]>([]);
  const { open } = useSidebar();
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [openFuelAlertDialog, setOpenFuelAlertDialog] = useState(false);
  const [openHotspotAlertDialog, setOpenHotspotAlertDialog] = useState(false);

  // Ensure user is logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Calculate commission based on inputs
  useEffect(() => {
    if (totalIncome !== undefined && workingDays !== undefined && workingDays > 0 && month !== "" && shiftType !== "" && commissionType !== "") {
      const income = totalIncome / workingDays;
      setAverageDailyIncome(income);

      const matchedTier = commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          income >= item.from &&
          income <= item.to
      );

      if (matchedTier) {
        setCommissionPercentage(matchedTier.percentage);
      } else {
        const aboveTier = commissionData.find(
          (item) =>
            item.shiftType === shiftType &&
            item.commissionType === commissionType &&
            item.to === Infinity &&
            income >= item.from
        );
        if (aboveTier) {
          setCommissionPercentage(aboveTier.percentage);
        } else {
          setCommissionPercentage(0);
          toast({
            title: "No commission tier found",
            description: "Could not determine commission percentage based on the inputs.",
          });
        }
      }

      // Determine next tiers
      const currentTier = commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          income >= item.from &&
          income <= item.to
      ) || commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          item.to === Infinity &&
          income >= item.from
      );

      const currentIndex = currentTier ? commissionData.indexOf(currentTier) : -1;
      let tiers: NextTierInfo[] = [];
      if (currentIndex !== -1) {
        let nextIndex = currentIndex + 1;
        while (nextIndex < commissionData.length) {
          const nextTier = commissionData[nextIndex];
          if (nextTier.shiftType === shiftType && nextTier.commissionType === commissionType) {
            tiers.push({
              percentage: nextTier.percentage,
              amountNeeded: Math.max(0, (nextTier.from - income) * workingDays),
            });
          }
          nextIndex++;
        }
      }
      setNextTierInfo(tiers);

    } else {
      setAverageDailyIncome(undefined);
      setCommissionPercentage(undefined);
      setNextTierInfo([]);
    }
  }, [totalIncome, workingDays, shiftType, commissionType, month]);

  const handleReset = () => {
    setMonth("");
    setShiftType("");
    setCommissionType("");
    setTotalIncome(undefined);
    setWorkingDays(undefined);
    setAverageDailyIncome(undefined);
    setCommissionPercentage(undefined);
    setNextTierInfo([]);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen antialiased text-foreground">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-14 items-center justify-center">
            <div className="flex items-center space-x-2">
              <Percent className="h-6 w-6 text-primary" />
              <span className="font-semibold">Commission Compass</span>
            </div>
          </div>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user?.role === "admin" && (
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>User Info</SidebarGroupLabel>
            <div className="px-2 py-2">
              <div className="rounded-md bg-primary/10 px-3 py-2 text-sm">
                <p className="font-semibold">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">Role: {user?.role}</p>
              </div>
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2 text-xs text-muted-foreground">
            Commission Compass Calculator v1.0
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Card className="w-full rounded-lg shadow-md mx-auto max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg md:text-2xl font-bold tracking-tight">Commission Percentage Calculator</CardTitle>
            <div className="flex items-center space-x-2">
              <Percent className="h-6 w-6 text-primary" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-secondary text-secondary-foreground">
                    Calculate your potential commission based on your monthly income.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="month">
                  <Calendar className="mr-2 h-4 w-4 inline-block" />
                  Select Month
                </Label>
                <Select onValueChange={setMonth} value={month} defaultValue={month}>
                  <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shiftType">
                  <Layers className="mr-2 h-4 w-4 inline-block" />
                  Select Shift Type
                </Label>
                <Select onValueChange={setShiftType} value={shiftType} defaultValue={shiftType}>
                  <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Shift">Single Shift</SelectItem>
                    <SelectItem value="Double Shift">Double Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="commissionType">
                  <Wallet className="mr-2 h-4 w-4 inline-block" />
                  Select Commission Type
                </Label>
                <Select onValueChange={setCommissionType} value={commissionType} defaultValue={commissionType}>
                  <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select commission type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="With Basic">With Basic</SelectItem>
                    <SelectItem value="With Out Basic">Without Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="totalIncome">
                  <BarChart className="mr-2 h-4 w-4 inline-block" />
                  Driver Income
                </Label>
                <Input
                  type="number"
                  id="totalIncome"
                  placeholder="Enter total income"
                  className="bg-input"
                  value={totalIncome !== undefined ? totalIncome.toString() : ''}
                  onChange={(e) => setTotalIncome(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="workingDays">
                  <Calendar className="mr-2 h-4 w-4 inline-block" />
                  Working Days
                </Label>
                <Input
                  type="number"
                  id="workingDays"
                  placeholder="Enter working days"
                  className="bg-input"
                  value={workingDays !== undefined ? workingDays.toString() : ''}
                  onChange={(e) => setWorkingDays(Number(e.target.value))}
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-4">
              <Button variant="secondary" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              
              <AlertDialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="icon">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Information</AlertDialogTitle>
                    <AlertDialogDescription>
                      Calculate your total income based on the total number of days in the month.
                      If your commission is below 10%, you are not eligible for 2 days off.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <AlertDialog open={openFuelAlertDialog} onOpenChange={setOpenFuelAlertDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="icon">
                    <Fuel className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fuel Percentage</AlertDialogTitle>
                    <AlertDialogDescription>
                      To be updated soon.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <Separator className="my-4" />
            
            <div className="mt-4 space-y-2">
              <div className="text-lg font-semibold">
                {averageDailyIncome !== undefined && (
                  <div className="flex items-center space-x-2">
                    <BarChart className="h-5 w-5" />
                    <span>Average Daily Income: {averageDailyIncome.toFixed(2)}</span>
                  </div>
                )}
                {commissionPercentage !== undefined && (
                  <div className="flex items-center space-x-2">
                    <Percent className="h-5 w-5" />
                    <span>Commission Percentage: {commissionPercentage}%</span>
                  </div>
                )}
              </div>
              
              {nextTierInfo.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold">Next Tiers:</div>
                  {nextTierInfo.map((tier, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>{tier.percentage}% (Need {tier.amountNeeded.toFixed(2)} more)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {user?.role === "admin" && (
              <div className="mt-4 border-t pt-4">
                <div className="text-sm font-semibold text-primary">Admin Controls</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm">Edit Commission Tiers</Button>
                  <Button size="sm">Export Report</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {user?.role === "admin" && <AdminSettings />}
      </div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || "lucide lucide-arrow-right"}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default Dashboard;
