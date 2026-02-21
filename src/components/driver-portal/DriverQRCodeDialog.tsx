import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";

interface DriverQRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string | null;
}

export const DriverQRCodeDialog = ({ isOpen, onClose, driverId, driverName }: DriverQRCodeDialogProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[340px] sm:max-w-[380px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-white text-lg font-bold tracking-wide">
            Driver ID Card
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* QR Code container */}
          <div className="p-1 rounded-2xl bg-gradient-to-br from-primary via-orange-400 to-amber-500 shadow-[0_0_30px_rgba(249,115,22,0.25)]">
            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
              <QRCodeCanvas
                value={driverId}
                size={180}
                level="L"
                bgColor="#ffffff"
                fgColor="#000000"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Driver ID */}
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest text-white/50">Driver ID</p>
            <p className="text-2xl font-bold tracking-wider text-white">{driverId}</p>
          </div>

          {/* Driver Name */}
          {driverName && (
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
              <p className="text-lg font-semibold text-white/90">{driverName}</p>
            </div>
          )}

          {/* Current Date & Time */}
          <div className="text-center space-y-0.5">
            <p className="text-xs uppercase tracking-widest text-white/50">Date & Time</p>
            <p className="text-sm font-medium text-white/80">{format(now, "dd MMM yyyy  •  hh:mm:ss a")}</p>
          </div>

          {/* Decorative divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
            <img
              src="/lovable-uploads/aman-logo-footer.png"
              alt="Aman"
              className="h-5 opacity-40"
            />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
