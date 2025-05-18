
import { useEffect, useRef, useState } from "react";

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
    window[callbackName.current] = function() {
      if (isMounted.current) {
        setIsScriptLoaded(true);
        onScriptLoad();
      }
    };
    
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
      return;
    }
    
    // Load the Google Maps script if it's not already loaded
    const loadScript = () => {
      if (scriptAdded.current) return;
      
      scriptAdded.current = true;
      
      const scriptId = `google-maps-script-${callbackName.current}`;
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      
      // If script doesn't exist, create it
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'text/javascript';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName.current}`;
        script.async = true;
        script.defer = true;
        
        script.onerror = () => {
          if (isMounted.current) {
            onError();
          }
        };
        
        document.head.appendChild(script);
      }
    };
    
    loadScript();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Clean up callback
      if (window[callbackName.current]) {
        try {
          delete window[callbackName.current];
        } catch (e) {
          window[callbackName.current] = undefined;
        }
      }
    };
  }, [apiKey, onScriptLoad, onError]);
  
  return {
    isScriptLoaded
  };
};
