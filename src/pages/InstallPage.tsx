import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Smartphone, Share, MoreVertical, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-white/80 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Install MyAman</h1>
          <p className="text-white/70">
            Install our app on your device for quick access anytime
          </p>
        </div>

        {isInstalled ? (
          <Card className="bg-green-500/20 border-green-500/30">
            <CardContent className="pt-6 text-center">
              <div className="text-green-400 text-lg font-medium">
                ✓ App is already installed!
              </div>
              <p className="text-white/70 mt-2">
                You can find MyAman on your home screen
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {deferredPrompt && (
              <Card className="mb-6 bg-white/10 border-white/20">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleInstall}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-6 text-lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Install Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {isIOS ? (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Share className="h-5 w-5" />
                    Install on iPhone/iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium">Tap the Share button</p>
                      <p className="text-white/60 text-sm">
                        Located at the bottom of Safari (square with arrow)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium">Scroll down and tap</p>
                      <p className="text-white/60 text-sm flex items-center gap-1">
                        <Plus className="h-4 w-4" /> "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium">Tap "Add"</p>
                      <p className="text-white/60 text-sm">
                        The app will appear on your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MoreVertical className="h-5 w-5" />
                    Install on Android
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium">Tap the menu button</p>
                      <p className="text-white/60 text-sm">
                        Three dots (⋮) in the top-right corner of Chrome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium">Tap "Install app" or "Add to Home screen"</p>
                      <p className="text-white/60 text-sm">
                        Option name may vary by browser
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium">Confirm installation</p>
                      <p className="text-white/60 text-sm">
                        The app will be added to your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            Once installed, you can use MyAman offline and it will launch like a native app
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
