
/// <reference types="vite/client" />

// Google Maps API types
interface Window {
  initMap: () => void;
  google: {
    maps: {
      Map: new (element: HTMLElement, options: any) => any;
      Marker: new (options: any) => any;
      SymbolPath: {
        CIRCLE: number;
      };
    };
  };
}
