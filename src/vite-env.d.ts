
/// <reference types="vite/client" />

// Google Maps API types
interface Window {
  [key: string]: any; // Allow dynamic property names for map initialization functions
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: any) => any;
      Marker: new (options: any) => any;
      SymbolPath: {
        CIRCLE: number;
      };
    };
  };
}
