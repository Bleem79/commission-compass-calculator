
import React from 'react';
import { useNavigate } from "react-router-dom";

interface CalculatorHeaderProps {
  userRole?: string;
  onLogout?: () => void;
}

export const CalculatorHeader = ({ userRole }: CalculatorHeaderProps) => {
  const navigate = useNavigate();
  
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
      </div>
    </div>
  );
};
