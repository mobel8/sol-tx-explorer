import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const NAV_ORDER = ["/", "/tx-builder", "/swap", "/bundles", "/vault"];

interface NavContextValue {
  direction: number; // 1 = forward (right to left), -1 = backward (left to right)
}

const NavigationContext = createContext<NavContextValue>({ direction: 1 });

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const prevIdx = NAV_ORDER.indexOf(prevPathRef.current);
    const currIdx = NAV_ORDER.indexOf(location.pathname);
    const newDir = currIdx >= prevIdx ? 1 : -1;
    setDirection(newDir);
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <NavigationContext.Provider value={{ direction }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
