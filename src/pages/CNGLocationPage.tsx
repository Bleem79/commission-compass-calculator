
import React, { useState, useEffect, useRef } from "react";
import { Map as MapIcon, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";

// CNG location data with properly formatted Google Maps embed URLs
const cngLocations = [
  {
    id: 1,
    name: "Al Mirqab",
    url: "https://maps.app.goo.gl/29Cn1UbFJ2v41hbD7",
    lat: 25.2930979,
    lng: 55.3859973,
  },
  {
    id: 2,
    name: "Maysaloon",
    url: "https://maps.app.goo.gl/3YE7fXz1bZTiWJBs6",
    lat: 25.2819871,
    lng: 55.4003829,
  },
  {
    id: 3,
    name: "Al Shahba",
    url: "https://maps.app.goo.gl/nT8JLk91Tjm8L72u5",
    lat: 25.3003995,
    lng: 55.3879364,
  },
  {
    id: 4,
    name: "Samnan",
    url: "https://maps.app.goo.gl/2XhRoq5Rmv22qpAy5",
    lat: 25.3240741,
    lng: 55.4052132,
  }
];

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [mapUrl, setMapUrl] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // For the Google Maps Embed API, we'll use the Places API to highlight CNG stations
    // We'll use a custom blue icon color parameter in the URL
    const apiKey = "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8"; // This is a public demo API key
    
    // Calculate center point
    const centerLat = cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length;
    const centerLng = cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length;
    
    // Create the embed URL with a search for CNG stations
    // Using the "search" mode with blue styling for the map pins
    const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${centerLat},${centerLng}&zoom=13&maptype=roadmap`;
    
    setMapUrl(embedUrl);
    
    // We'll add a custom map overlay with blue markers since the Embed API doesn't support custom marker colors
    const loadGoogleMapsScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Define the initMap function on the window object before loading the script
      window.initMap = function() {
        if (mapRef.current) {
          const mapOptions = {
            center: { lat: centerLat, lng: centerLng },
            zoom: 13,
          };
          const map = new window.google.maps.Map(mapRef.current, mapOptions);
          
          // Add blue markers for each location
          cngLocations.forEach(location => {
            new window.google.maps.Marker({
              position: { lat: location.lat, lng: location.lng },
              map: map,
              title: location.name,
              label: {
                text: location.id.toString(),
                color: "white"
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#0EA5E9", // Ocean Blue color
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 10
              }
            });
          });
        }
      };
      
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
    
    // Clean up function to remove the script
    return () => {
      delete window.initMap;
      const script = document.querySelector('script[src*="maps.googleapis.com/maps/api"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  const openLocation = (url: string) => {
    window.open(url, "_blank");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="w-full mb-8">
          <h1 className="text-3xl font-bold text-indigo-800 mb-4">
            CNG Locations
          </h1>
          <p className="text-slate-600 mb-6">
            Find nearby CNG stations for refueling. Click on a station to view its location on Google Maps.
          </p>
          
          {user && (
            <UserProfile 
              email={user.email} 
              username={user.username} 
              role={user.role}
            />
          )}
        </div>

        {/* Map showing all CNG stations with blue markers */}
        <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-indigo-300 mb-8">
          <div 
            ref={mapRef} 
            style={{ width: '100%', height: '100%' }}
            className="relative"
          >
            {/* This is where our custom Google Map will be rendered */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">Loading map...</p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-indigo-700 mb-4">CNG Station Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cngLocations.map((location) => (
            <Card 
              key={location.id}
              className="bg-white shadow-md hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                      {location.id}
                    </div>
                    <h3 className="text-lg font-medium">{location.name}</h3>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => openLocation(location.url)}
                    className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Navigation size={18} />
                    Open in Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CNGLocationPage;
