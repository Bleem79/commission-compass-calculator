
interface LoadScriptProps {
  apiKey: string;
  callbackName: string;
  onInitialize: () => void;
  onError: () => void;
  isMounted: React.MutableRefObject<boolean>;
  scriptAdded: React.MutableRefObject<boolean>;
}

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
  // Check if script is already loaded
  if (window.google && window.google.maps) {
    console.log("Google Maps already loaded, initializing directly");
    onInitialize();
    return;
  }
  
  // Check if we already tried to add the script
  if (scriptAdded.current) {
    return;
  }
  
  scriptAdded.current = true;
  
  // Create new script element
  const script = document.createElement("script");
  script.id = `google-maps-script-${callbackName}`;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
  script.async = true;
  script.defer = true;
  
  // Handle script loading error
  script.onerror = () => {
    console.error("Failed to load Google Maps script");
    if (isMounted.current) {
      onError();
    }
  };
  
  console.log("Adding Google Maps script to document");
  document.head.appendChild(script);
};

/**
 * Creates a marker for the Google Map
 */
export const createMapMarker = (
  map: google.maps.Map, 
  marker: {
    id: number;
    name: string;
    lat: number;
    lng: number;
  }
): google.maps.Marker => {
  // Ensure the Google Maps API is loaded
  if (!window.google || !window.google.maps) {
    throw new Error("Google Maps API not loaded");
  }

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
};

/**
 * Type definition for Google Maps marker options
 */
export interface GoogleMapMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

