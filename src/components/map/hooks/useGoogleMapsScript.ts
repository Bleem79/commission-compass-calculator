
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
    if (!window[callbackName.current]) {
      window[callbackName.current] = function() {
        if (isMounted.current) {
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

    // Load the Google Maps script if not already loaded
    if (!isGoogleMapsLoaded) {
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
      setTimeout(onScriptLoad, 0);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Clean up the callback function but don't remove script
      if (window[callbackName.current]) {
        delete window[callbackName.current];
      }
    };
  }, [apiKey, onScriptLoad, onError]);
  
  return {
    isScriptLoaded: Boolean(window.google && window.google.maps && typeof window.google.maps.Map === 'function')
  };
};
