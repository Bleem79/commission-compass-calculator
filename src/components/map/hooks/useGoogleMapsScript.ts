import { useEffect, useRef, useState, useCallback } from "react";

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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  
  // Stable callback refs to avoid dependency changes
  const onScriptLoadRef = useRef(onScriptLoad);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onScriptLoadRef.current = onScriptLoad;
    onErrorRef.current = onError;
  }, [onScriptLoad, onError]);
  
  useEffect(() => {
    isMounted.current = true;
    const currentCallback = callbackName.current;
    
    // Check if Google Maps is already loaded
    if (window.google?.maps?.Map) {
      setIsScriptLoaded(true);
      onScriptLoadRef.current();
      return;
    }
    
    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkLoaded);
          if (isMounted.current) {
            setIsScriptLoaded(true);
            onScriptLoadRef.current();
          }
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.Map && isMounted.current) {
          setHasError(true);
          onErrorRef.current();
        }
      }, 10000);
      
      return () => {
        clearInterval(checkLoaded);
        isMounted.current = false;
      };
    }
    
    // Define callback function
    (window as any)[currentCallback] = () => {
      if (isMounted.current) {
        setIsScriptLoaded(true);
        onScriptLoadRef.current();
      }
    };
    
    // Create and add script with async loading
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${currentCallback}&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      if (isMounted.current) {
        setHasError(true);
        onErrorRef.current();
      }
    };
    
    document.head.appendChild(script);
    
    // Cleanup
    return () => {
      isMounted.current = false;
      
      // Clean up callback
      if ((window as any)[currentCallback]) {
        try {
          delete (window as any)[currentCallback];
        } catch {
          (window as any)[currentCallback] = undefined;
        }
      }
    };
  }, [apiKey]);
  
  return { isScriptLoaded, hasError };
};
