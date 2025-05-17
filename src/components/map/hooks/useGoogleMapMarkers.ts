
import { useCallback, useRef, useEffect } from "react";

interface Marker {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface UseGoogleMapMarkersProps {
  map: any | null;
  markers: Marker[];
  isMapInitialized: boolean;
}

export const useGoogleMapMarkers = ({ 
  map, 
  markers, 
  isMapInitialized 
}: UseGoogleMapMarkersProps) => {
  const markersRef = useRef<any[]>([]);
  
  // Clear any existing markers
  const clearMarkers = useCallback(() => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];
    }
  }, []);
  
  // Update markers
  const updateMarkers = useCallback(() => {
    if (!isMapInitialized || !map) {
      return;
    }
    
    clearMarkers();
    
    if (markers && markers.length > 0) {
      markers.forEach((markerData) => {
        try {
          const marker = new window.google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map,
            title: markerData.name,
            label: {
              text: markerData.id.toString(),
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
          markersRef.current.push(marker);
        } catch (err) {
          console.error("Failed to create marker:", err);
        }
      });
    }
  }, [map, markers, isMapInitialized, clearMarkers]);
  
  useEffect(() => {
    updateMarkers();
    
    return () => {
      clearMarkers();
    };
  }, [markers, map, updateMarkers, clearMarkers]);
  
  return { clearMarkers };
};
