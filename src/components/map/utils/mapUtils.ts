
interface LoadScriptProps {
  apiKey: string;
  callbackName: string;
  onInitialize: () => void;
  onError: () => void;
  isMounted: React.MutableRefObject<boolean>;
  scriptAdded: React.MutableRefObject<boolean>;
}

/**
 * Type definition for Google Maps marker options
 */
export interface GoogleMapMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

// Keep track of loaded scripts globally to prevent duplicate loading
const loadedScripts: Record<string, boolean> = {};
const scriptLoadingInProgress: Record<string, boolean> = {};

/**
 * Utility function to load the Google Maps script
 */
export const loadGoogleMapsScript = ({
  apiKey,
  callbackName,
  onInitialize,
  onError,
  isMounted,
  scriptAdded
}: LoadScriptProps) => {
  // Check if script is already loaded and available
  if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
    console.log("Google Maps already loaded, initializing directly");
    setTimeout(onInitialize, 0);
    return;
  }
  
  // Check if we already tried to add the script
  if (scriptAdded.current) {
    return;
  }
  
  scriptAdded.current = true;
  
  // Create unique script ID based on callback name
  const scriptId = `google-maps-script-${callbackName}`;
  
  // Check if script already exists in DOM
  const existingScript = document.getElementById(scriptId);
  if (existingScript) {
    console.log("Google Maps script already in DOM, waiting for callback");
    return;
  }
  
  // Check if script is currently loading
  if (scriptLoadingInProgress[scriptId]) {
    console.log("Google Maps script is currently loading");
    return;
  }
  
  scriptLoadingInProgress[scriptId] = true;
  
  try {
    // Create new script element with specific options to work better with React
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.nonce = ""; // Help with CSP issues
    
    // Handle script loading error
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      
      // Clean up loading state
      scriptLoadingInProgress[scriptId] = false;
      
      if (isMounted.current) {
        onError();
      }
      
      // Mark script as not loaded
      loadedScripts[scriptId] = false;
    };
    
    // Handle script load success
    script.onload = () => {
      scriptLoadingInProgress[scriptId] = false;
      loadedScripts[scriptId] = true;
    };
    
    console.log("Adding Google Maps script to document");
    document.head.appendChild(script);
  } catch (err) {
    console.error("Error adding script to document:", err);
    
    // Clean up loading state
    scriptLoadingInProgress[scriptId] = false;
    
    if (isMounted.current) {
      onError();
    }
  }
};

/**
 * Utility to clean up Google Maps callback
 * ONLY clears the callback function, doesn't remove script tag
 */
export const cleanupGoogleMapsScript = (callbackName: string) => {
  // Only clear the callback function, don't remove the script
  if (window[callbackName]) {
    try {
      delete window[callbackName];
    } catch (e) {
      // For older browsers that don't support delete on window
      window[callbackName] = undefined;
    }
  }
};

/**
 * Creates a marker for the Google Map
 */
export const createMapMarker = (
  map: any, // Use 'any' type instead of google.maps.Map
  marker: GoogleMapMarker
): any => { // Use 'any' type instead of google.maps.Marker
  // Ensure the Google Maps API is loaded
  if (!window.google || !window.google.maps) {
    throw new Error("Google Maps API not loaded");
  }

  try {
    return new window.google.maps.Marker({
      position: { lat: marker.lat, lng: marker.lng },
      map,
      title: marker.name,
      label: {
        text: marker.id.toString(),
        color: "white",
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: "#0EA5E9",
        fillOpacity: 1,
        strokeWeight: 0,
        scale: 10,
      },
    });
  } catch (err) {
    console.error("Error creating map marker:", err);
    throw err;
  }
};
