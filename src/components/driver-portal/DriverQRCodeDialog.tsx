import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface DriverQRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string | null;
}

export const DriverQRCodeDialog = ({ isOpen, onClose, driverId, driverName }: DriverQRCodeDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-center text-white text-lg font-bold tracking-wide">
            Driver ID Card
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 px-6 pb-8">
          {/* QR Code container */}
          <div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary via-orange-400 to-amber-500 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
            <div className="bg-white rounded-xl p-4">
              <QRCodeSVG
                value={driverId}
                size={200}
                level="H"
                bgColor="#ffffff"
                fgColor="#1e1b4b"
                imageSettings={{
                  src: "/lovable-uploads/aman-logo-footer.png",
                  x: undefined,
                  y: undefined,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
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
