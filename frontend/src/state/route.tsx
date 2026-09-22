import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

export type Route = { id: number; name: string };
/** "" means all routes; a number filters to that route. */
export type RouteFilter = number | "";

type RouteContextValue = {
  routes: Route[];
  routeId: RouteFilter;
  setRouteId: (v: RouteFilter) => void;
};

const RouteContext = createContext<RouteContextValue>({
  routes: [],
  routeId: "",
  setRouteId: () => {},
});

export function RouteProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<RouteFilter>("");
  useEffect(() => {
    api<Route[]>("/routes")
      .then(setRoutes)
      .catch(() => {});
  }, []);
  return (
    <RouteContext.Provider value={{ routes, routeId, setRouteId }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  return useContext(RouteContext);
}

/** Append the shared route filter to an API path ("" = all routes, no param). */
export function withRouteFilter(path: string, routeId: RouteFilter): string {
  return routeId === "" ? path : `${path}?route_id=${routeId}`;
}
