export type SubmissionStatus = "preparing" | "shipped" | "received" | "grading" | "graded" | "returned";

export interface Submission {
  id: string;
  tcgPlayerId: string;
  name: string;
  set: string;
  image?: string;
  rarity: string;
  number: string;
  rawPrice: number;
  psa10Price: number;
  psa9Price: number;
  gradingFee: number;
  shippingCost: number;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt?: string;
  returnedAt?: string;
  actualGrade?: number;
  soldPrice?: number;
  soldAt?: string;
  notes?: string;
  submissionNumber?: string;
}

const KEY = "pokeroi-submissions";

export function getSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addSubmission(item: Submission): void {
  const list = getSubmissions();
  localStorage.setItem(KEY, JSON.stringify([...list, item]));
}

export function updateSubmission(id: string, updates: Partial<Submission>): void {
  const list = getSubmissions().map((s) => s.id === id ? { ...s, ...updates } : s);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteSubmission(id: string): void {
  const list = getSubmissions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}