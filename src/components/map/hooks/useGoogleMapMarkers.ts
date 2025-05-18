
import { useCallback, useRef, useEffect, useState } from "react";

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
  const lastMarkersLength = useRef<number>(0);
  const isMounted = useRef(true);
  const [activeMarkers, setActiveMarkers] = useState<any[]>([]);
  
  // Clear any existing markers
  const clearMarkers = useCallback(() => {
    if (!isMounted.current) return;
    
    if (activeMarkers.length > 0) {
      activeMarkers.forEach(marker => {
        if (marker) {
          try {
            marker.setMap(null);
          } catch (err) {
            console.error("Error clearing marker:", err);
          }
        }
      });
      setActiveMarkers([]);
    }
  }, [activeMarkers]);
  
  // Update markers
  const updateMarkers = useCallback(() => {
    if (!isMounted.current) return;
    
    // Only create markers if we have all dependencies
    if (!isMapInitialized || !map || !window.google || !window.google.maps) {
      return;
    }
    
    // Avoid unnecessary marker updates
    if (markers.length === lastMarkersLength.current && activeMarkers.length === markers.length) {
      return;
    }
    
    clearMarkers();
    lastMarkersLength.current = markers.length;
    
    if (markers && markers.length > 0) {
      const newMarkers = [];
      
      for (const markerData of markers) {
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
          newMarkers.push(marker);
        } catch (err) {
          console.error("Failed to create marker:", err);
        }
      }
      
      // Only update reference after all markers are created
      markersRef.current = newMarkers;
      setActiveMarkers(newMarkers);
    }
  }, [map, markers, isMapInitialized, clearMarkers, activeMarkers]);
  
  useEffect(() => {
    isMounted.current = true;
    
    if (isMapInitialized && map) {
      updateMarkers();
    }
    
    return () => {
      isMounted.current = false;
      clearMarkers();
    };
  }, [markers, map, updateMarkers, clearMarkers, isMapInitialized]);
  
  return { clearMarkers };
};
