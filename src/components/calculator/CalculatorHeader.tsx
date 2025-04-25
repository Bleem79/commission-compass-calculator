
import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface CalculatorHeaderProps {
  userRole?: string;
  onLogout: () => void;
}

export const CalculatorHeader = ({ userRole, onLogout }: CalculatorHeaderProps) => {
  // Debug the role being received
  console.log("CalculatorHeader received role:", userRole);
  
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-indigo-800">
          Commission Percentage Calculator
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        {userRole && (
          <span className="text-sm text-muted-foreground mr-2">
            Role: {userRole}
          </span>
        )}
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};
