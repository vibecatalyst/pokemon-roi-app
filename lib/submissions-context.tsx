"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Submission,
  getSubmissions,
  addSubmission as localAdd,
  updateSubmission as localUpdate,
  deleteSubmission as localDelete,
} from "@/lib/submissions";
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission } from "@/lib/db";

function mapDbSubmission(row: Record<string, unknown>): Submission {
  return {
    id: String(row.id ?? ""),
    tcgPlayerId: String(row.tcg_player_id ?? ""),
    name: String(row.name ?? ""),
    set: String(row.set_name ?? ""),
    image: row.image ? String(row.image) : undefined,
    rarity: String(row.rarity ?? ""),
    number: String(row.number ?? ""),
    rawPrice: Number(row.raw_price ?? 0),
    psa10Price: Number(row.psa10_price ?? 0),
    psa9Price: Number(row.psa9_price ?? 0),
    psa8Price: Number(row.psa8_price ?? 0),
    psa7Price: Number(row.psa7_price ?? 0),
    gradingFee: Number(row.grading_fee ?? 0),
    shippingCost: Number(row.shipping_cost ?? 0),
    status: (row.status as Submission["status"]) ?? "preparing",
    submissionNumber: row.submission_number ? String(row.submission_number) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    actualGrade: row.actual_grade ? Number(row.actual_grade) : undefined,
    soldPrice: row.sold_price ? Number(row.sold_price) : undefined,
    submittedAt: String(row.submitted_at ?? new Date().toISOString()),
    gradedAt: row.graded_at ? String(row.graded_at) : undefined,
    returnedAt: row.returned_at ? String(row.returned_at) : undefined,
  };
}

interface SubmissionsContextType {
  submissions: Submission[];
  loading: boolean;
  addItem: (submission: Submission) => Promise<void>;
  updateItem: (submission: Submission) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const SubmissionsContext = createContext<SubmissionsContextType>({
  submissions: [],
  loading: false,
  addItem: async () => {},
  updateItem: async () => {},
  deleteItem: async () => {},
  reload: async () => {},
});

export function SubmissionsProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    reload();
  }, [isSignedIn]);

  async function reload() {
    setLoading(true);
    try {
      if (isSignedIn) {
        const data = await dbGetSubmissions();
        if (data) {
          setSubmissions(data.map(mapDbSubmission));
          return;
        }
      }
      setSubmissions(getSubmissions());
    } catch {
      setSubmissions(getSubmissions());
    } finally {
      setLoading(false);
    }
  }

  async function addItem(submission: Submission) {
    if (isSignedIn) {
      await dbSaveSubmission(submission as unknown as Record<string, unknown>);
      await reload();
    } else {
      localAdd(submission);
      setSubmissions(getSubmissions());
    }
  }

  async function updateItem(submission: Submission) {
    if (isSignedIn) {
      await dbSaveSubmission(submission as unknown as Record<string, unknown>);
      await reload();
    } else {
      localUpdate(submission.id, submission);
      setSubmissions(getSubmissions());
    }
  }

  async function deleteItem(id: string) {
    if (isSignedIn) {
      await dbDeleteSubmission(id);
      await reload();
    } else {
      localDelete(id);
      setSubmissions(getSubmissions());
    }
  }

  return (
    <SubmissionsContext.Provider value={{ submissions, loading, addItem, updateItem, deleteItem, reload }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  return useContext(SubmissionsContext);
}