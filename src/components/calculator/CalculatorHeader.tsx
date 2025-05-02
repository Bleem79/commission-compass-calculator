
import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface CalculatorHeaderProps {
  userRole?: string;
  onLogout: () => void;
}

export const CalculatorHeader = ({ userRole, onLogout }: CalculatorHeaderProps) => {
  const navigate = useNavigate();
  
  const handleViewCommissionTable = () => {
    navigate('/commission-table');
  };
  
  return (
    <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold text-indigo-800">
          Commission Percentage Calculator
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {userRole && (
          <span className="text-slate-600">
            Role: {userRole}
          </span>
        )}
        
        <Button 
          variant="outline" 
          className="text-slate-700 border-slate-300 bg-white hover:bg-slate-50"
          onClick={handleViewCommissionTable}
        >
          View Commission Table
        </Button>
        
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};
