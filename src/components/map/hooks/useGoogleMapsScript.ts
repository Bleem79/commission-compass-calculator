
import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, cleanupGoogleMapsScript } from "../utils/mapUtils";

interface UseGoogleMapsScriptProps {
  apiKey: string;
  onScriptLoad: () => void;
  onError: () => void;
}

export const useGoogleMapsScript = ({
  apiKey,
  onScriptLoad,
  onError,
}: UseGoogleMapsScriptProps) => {
  const isMounted = useRef(true);
  const scriptAdded = useRef(false);
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  useEffect(() => {
    // Set up mounted ref for cleanup
    isMounted.current = true;
    
    // Define the Google Maps callback function
    if (!window[callbackName.current]) {
      window[callbackName.current] = function() {
        if (isMounted.current) {
          setIsScriptLoaded(true);
          onScriptLoad();
        }
      };
    }
    
    // Check if Google Maps is already loaded
    const isGoogleMapsLoaded = Boolean(
      window.google && 
      window.google.maps && 
      typeof window.google.maps.Map === 'function'
    );

    if (isGoogleMapsLoaded) {
      // If already loaded, call callback
      setIsScriptLoaded(true);
      setTimeout(onScriptLoad, 0);
    } else {
      loadGoogleMapsScript({
        apiKey,
        callbackName: callbackName.current,
        onInitialize: () => {
          if (isMounted.current) {
            setIsScriptLoaded(true);
            onScriptLoad();
          }
        },
        onError: () => {
          if (isMounted.current) {
            onError();
          }
        },
        isMounted,
        scriptAdded
      });
    }
    
    // Cleanup function that's safer for React
    return () => {
      isMounted.current = false;
      
      // Only clean up callback, don't remove script
      cleanupGoogleMapsScript(callbackName.current);
    };
  }, [apiKey, onScriptLoad, onError]);
  
  return {
    isScriptLoaded
  };
};
