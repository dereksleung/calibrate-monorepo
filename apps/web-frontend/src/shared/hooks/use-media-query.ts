import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = () =>
    typeof window !== "undefined" && window.matchMedia(query).matches;

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// export default function mediaQueryList(query) {
//   const subscribe = React.useCallback((callback) => {
//     const mediaQueryList = window.matchMedia(query);
//     mediaQueryList.addEventListener("change", callback);
//     return () => mediaQueryList.removeEventListener("change", callback);
//   }, [query]);

//   const getSnapshot = () => {
//     return window.matchMedia(query).matches;
//   };

//   return React.useSyncExternalStore(subscribe, getSnapshot);
// };

// md breakpointhelps catch landscape mobile devices
// Tailwind's md breakpoint is min-width 768px
const BELOW_MD_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  return useMediaQuery(BELOW_MD_QUERY);
}
