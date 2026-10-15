import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import PayslipNoticeDialog from "./components/shared/PayslipNoticeDialog";

function Check() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 24 }}>
      <button id="trigger" onClick={() => setOpen(true)}>
        Show notice
      </button>
      <PayslipNoticeDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Check />);
