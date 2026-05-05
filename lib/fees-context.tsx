"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
}

const FeesContext = createContext<FeesContextType>({
  fees: DEFAULT_FEES,
  setFees: () => {},
});

export function FeesProvider({ children }: { children: ReactNode }) {
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  return (
    <FeesContext.Provider value={{ fees, setFees }}>
      {children}
    </FeesContext.Provider>
  );
}

export function useFees() {
  return useContext(FeesContext);
}