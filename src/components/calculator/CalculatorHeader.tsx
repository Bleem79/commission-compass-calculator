import { Percent, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface CalculatorHeaderProps {
  userRole?: string;
  onLogout: () => void;
}

export const CalculatorHeader = ({ userRole, onLogout }: CalculatorHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Percent className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-indigo-800">Driver Commission Calculator</h1>
      </div>
      <div className="flex items-center gap-4">
        {userRole === 'admin' && (
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5 text-indigo-600" />
          </Button>
        )}
        <Button variant="ghost" onClick={onLogout}>
          <span className="text-indigo-600">Logout</span>
        </Button>
      </div>
    </div>
  );
};
