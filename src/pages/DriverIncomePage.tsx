import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const DriverIncomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    } else if (!isAdmin) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/home")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-800">
            Last Month 5 or 6days Driver Income
          </h1>
        </div>

        {/* Content Placeholder */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600 text-center">
            Driver income data will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverIncomePage;
