import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-attempted";

/**
 * Lazy-load a module; if its chunk is stale after a new deploy/rebuild,
 * reload the page once to fetch fresh assets instead of crashing.
 */
export const lazyRetry = <T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>
) =>
  lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    }
  });

/** Global fallback for Vite preload failures (stale CSS/JS chunks). */
export const installChunkErrorReload = () => {
  window.addEventListener("vite:preloadError", (event) => {
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    event.preventDefault();
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  });
};
