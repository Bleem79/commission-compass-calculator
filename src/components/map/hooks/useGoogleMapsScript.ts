
import { useEffect, useRef } from "react";
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
  
  // Generate a unique callback name for this map instance that persists across renders
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`);
  
  useEffect(() => {
    // Set up mounted ref for cleanup
    isMounted.current = true;
    
    // Define the Google Maps callback function
    window[callbackName.current] = function() {
      if (isMounted.current) {
        onScriptLoad();
      }
    };
    
    // Load the Google Maps script
    if (!window.google || !window.google.maps) {
      loadGoogleMapsScript({
        apiKey,
        callbackName: callbackName.current,
        onInitialize: onScriptLoad,
        onError: () => {
          if (isMounted.current) {
            onError();
          }
        },
        isMounted,
        scriptAdded
      });
    } else {
      // If Google Maps is already loaded, just call the callback
      onScriptLoad();
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Clean up the callback function but don't remove script
      if (window[callbackName.current]) {
        cleanupGoogleMapsScript(callbackName.current);
      }
    };
  }, [apiKey, onScriptLoad, onError]);
  
  return {
    isScriptLoaded: window.google && window.google.maps ? true : false
  };
};
