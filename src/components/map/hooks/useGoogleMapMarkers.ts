
import { useEffect, useRef, useState } from "react";

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
  const markersDataRef = useRef<Marker[]>([]);
  const isMounted = useRef(true);
  
  // Use this reference for cleanup to avoid state updates on unmounted component
  markersDataRef.current = markers;
  
  // Clear any existing markers - Used during cleanup
  const clearMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        if (marker) {
          try {
            marker.setMap(null);
          } catch (err) {
            console.error("Error clearing marker:", err);
          }
        }
      });
      markersRef.current = [];
    }
  };
  
  // Create markers when map is ready and markers data is available
  useEffect(() => {
    // Only create markers if we have all dependencies
    if (!isMapInitialized || !map || !window.google || !window.google.maps) {
      return;
    }
    
    // Clear previous markers
    clearMarkers();
    
    // Create new markers
    const newMarkers: any[] = [];
    
    if (markers && markers.length > 0) {
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
      
      // Update markers reference
      markersRef.current = newMarkers;
    }
    
    // Cleanup function
    return () => {
      clearMarkers();
    };
  }, [map, markers, isMapInitialized]);
  
  // Make sure all markers are cleared on unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      clearMarkers();
    };
  }, []);
};
