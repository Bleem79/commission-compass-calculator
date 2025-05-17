
/// <reference types="vite/client" />

// Google Maps API types
interface Window {
  [key: string]: any; // Allow dynamic property names for map initialization functions
  google?: {
    maps: {
      Map: any;
      Marker: any;
      MapTypeId: {
        ROADMAP: string;
        SATELLITE: string;
        HYBRID: string;
        TERRAIN: string;
      };
      LatLng: any;
      SymbolPath: {
        CIRCLE: number;
        FORWARD_CLOSED_ARROW: number;
        FORWARD_OPEN_ARROW: number;
        BACKWARD_CLOSED_ARROW: number;
        BACKWARD_OPEN_ARROW: number;
      };
    };
  };
}
