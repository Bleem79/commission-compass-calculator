
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  // Instead of using useNavigate which might cause DOM issues during initial render,
  // we'll use the Navigate component which handles redirects more cleanly
  return <Navigate to="/login" replace />;
};

export default Index;
