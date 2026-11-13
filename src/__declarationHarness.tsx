import { createRoot } from "react-dom/client";
import "./index.css";
import DriverDeclarationsSection from "@/components/training/DriverDeclarationsSection";
createRoot(document.getElementById("root")!).render(<div className="min-h-screen bg-background p-4"><DriverDeclarationsSection driverId="121212" driverName="Test Driver" /></div>);
