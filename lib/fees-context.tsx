"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { FeeSettings } from "@/lib/types";

export const DEFAULT_FEES: FeeSettings = {
  gradingFee: 25,
  shippingToGrader: 8,
  shippingBack: 8,
  ebayFeePercent: 13.25,
  buyingFeePercent: 0,
};

interface FeesContextType {
  fees: FeeSettings;
  setFees: (fees: FeeSettings) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const FeesContext = createContext<FeesContextType>({
  fees: DEFAULT_FEES,
  setFees: () => {},
  darkMode: true,
  toggleDarkMode: () => {},
});

export function FeesProvider({ children }: { children: ReactNode }) {
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("pokeroi-darkmode");
    if (saved !== null) setDarkMode(saved === "true");
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("pokeroi-darkmode", String(next));
  }

  return (
    <FeesContext.Provider value={{ fees, setFees, darkMode, toggleDarkMode }}>
      <div className={darkMode ? "dark" : "light"} style={{ minHeight: "100vh", background: darkMode ? "#0a0a0f" : "#f4f4f5", color: darkMode ? "white" : "#09090b" }}>
        {children}
      </div>
    </FeesContext.Provider>
  );
}

export function useFees() {
  return useContext(FeesContext);
}