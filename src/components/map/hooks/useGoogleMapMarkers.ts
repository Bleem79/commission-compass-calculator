import { useEffect, useRef } from "react";

interface Marker {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface UseGoogleMapMarkersProps {
  map: any;
  markers: Marker[];
  isMapInitialized: boolean;
}

export const useGoogleMapMarkers = ({ 
  map, 
  markers, 
  isMapInitialized 
}: UseGoogleMapMarkersProps) => {
  const markersRef = useRef<any[]>([]);
  
  // Clear all markers
  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      try {
        marker.setMap(null);
      } catch (err) {
        console.error("Error clearing marker:", err);
      }
    });
    markersRef.current = [];
  };
  
  // Create markers when map is ready
  useEffect(() => {
    if (!isMapInitialized || !map || !window.google?.maps?.Marker) {
      return;
    }
    
    // Clear previous markers
    clearMarkers();
    
    // Create new markers
    if (markers?.length > 0) {
      markers.forEach((markerData) => {
        try {
          const marker = new window.google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map,
            title: markerData.name,
            label: {
              text: markerData.id.toString(),
              color: "white",
              fontWeight: "bold",
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#0EA5E9",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
              scale: 12,
            },
          });
          
          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div class="p-2"><strong>${markerData.name}</strong></div>`,
          });
          
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
          
          markersRef.current.push(marker);
        } catch (err) {
          console.error("Failed to create marker:", err);
        }
      });
    }
    
    return () => {
      clearMarkers();
    };
  }, [map, markers, isMapInitialized]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, []);
};
