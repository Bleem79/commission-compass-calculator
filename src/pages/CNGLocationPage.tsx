
import React, { useState } from "react";
import { Map as MapIcon, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";

// CNG location data with only area names
const cngLocations = [
  {
    id: 1,
    name: "Al Mirqab",
    url: "https://maps.app.goo.gl/29Cn1UbFJ2v41hbD7"
  },
  {
    id: 2,
    name: "Maysaloon",
    url: "https://maps.app.goo.gl/3YE7fXz1bZTiWJBs6"
  },
  {
    id: 3,
    name: "Al Shahba",
    url: "https://maps.app.goo.gl/nT8JLk91Tjm8L72u5"
  },
  {
    id: 4,
    name: "Samnan",
    url: "https://maps.app.goo.gl/2XhRoq5Rmv22qpAy5"
  }
];

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const openLocation = (url: string) => {
    setSelectedLocation(url);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cngLocations.map((location) => (
            <Card 
              key={location.id}
              className="bg-white shadow-md hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <MapIcon className="h-6 w-6 text-indigo-600 mr-2" />
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

        {selectedLocation && (
          <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-indigo-300">
            <iframe
              title="Google Maps"
              src={`${selectedLocation.replace('maps.app.goo.gl', 'www.google.com/maps/embed')}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CNGLocationPage;
