
import React from 'react';
import { useNavigate } from "react-router-dom";

interface CalculatorHeaderProps {
  userRole?: string;
  onLogout?: () => void;
}

export const CalculatorHeader = ({ userRole }: CalculatorHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-800">
          Commission Calculator
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {userRole && (
          <span className="text-sm sm:text-base text-slate-600">
            Role: {userRole}
          </span>
        )}
      </div>
    </div>
  );
};
