
import React, { useState } from "react";
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
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3607.848954444767!2d55.3859973!3d25.2930979!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d346b0343d7%3A0xbcac7fb5dde6836a!2sAl%20Mirqab%20-%20Dubai!5e0!3m2!1sen!2sae!4v1652883612774!5m2!1sen!2sae"
  },
  {
    id: 2,
    name: "Maysaloon",
    url: "https://maps.app.goo.gl/3YE7fXz1bZTiWJBs6",
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.2630531374716!2d55.4003829!3d25.2819871!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d7c27b223dd%3A0xf76c360ba5af34d5!2sMaysaloon%20-%20Dubai!5e0!3m2!1sen!2sae!4v1652883712774!5m2!1sen!2sae"
  },
  {
    id: 3,
    name: "Al Shahba",
    url: "https://maps.app.goo.gl/nT8JLk91Tjm8L72u5",
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3607.621026121312!2d55.3879364!3d25.3003995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d2d957c078b%3A0x4ac0c3829d763cc9!2sAl%20Shahba%20-%20Dubai!5e0!3m2!1sen!2sae!4v1652883812774!5m2!1sen!2sae"
  },
  {
    id: 4,
    name: "Samnan",
    url: "https://maps.app.goo.gl/2XhRoq5Rmv22qpAy5",
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.79307496303!2d55.4052132!3d25.3240741!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5c3b4050b571%3A0xb8e3c99a4625cc5c!2sSamnan%20-%20Dubai!5e0!3m2!1sen!2sae!4v1652883912774!5m2!1sen!2sae"
  }
];

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const openLocation = (url: string, embedUrl: string) => {
    window.open(url, "_blank");
    setSelectedLocation(embedUrl);
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
                    onClick={() => openLocation(location.url, location.embedUrl)}
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
              src={selectedLocation}
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
