"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FeeSettings } from "@/lib/types";

export const DEFAULT_FEES: FeeSettings = {
  gradingFee: 32.99,
  shippingToGrader: 8,
  shippingBack: 8,
  ebayFeePercent: 13.25,
  buyingFeePercent: 0,
};

export const PSA_TIERS = [
  { label: "Value Bulk", fee: 24.99, description: "$24.99/card · bulk orders" },
  { label: "Value", fee: 32.99, description: "$32.99/card · standard" },
  { label: "Value Plus", fee: 49.99, description: "$49.99/card · faster" },
  { label: "Value Max", fee: 64.99, description: "$64.99/card · priority" },
  { label: "Regular", fee: 79.99, description: "$79.99/card · regular" },
  { label: "Express", fee: 149.00, description: "$149.00/card · express" },
  { label: "Super Express", fee: 299.00, description: "$299.00/card · super express" },
  { label: "WalkThrough", fee: 599.00, description: "$599.00/card · same day" },
];

interface FeesContextType {
  fees: FeeSettings;
  setFees: (fees: FeeSettings) => void;
  psaTier: string;
  setPsaTier: (tier: string) => void;
}

const FeesContext = createContext<FeesContextType>({
  fees: DEFAULT_FEES,
  setFees: () => {},
  psaTier: "Value",
  setPsaTier: () => {},
});

export function FeesProvider({ children }: { children: ReactNode }) {
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  const [psaTier, setPsaTierState] = useState("Value");

  function setPsaTier(tier: string) {
    const found = PSA_TIERS.find(t => t.label === tier);
    if (found) {
      setPsaTierState(tier);
      setFees({ ...fees, gradingFee: found.fee });
    }
  }

  return (
    <FeesContext.Provider value={{ fees, setFees, psaTier, setPsaTier }}>
      {children}
    </FeesContext.Provider>
  );
}

export function useFees() {
  return useContext(FeesContext);
}