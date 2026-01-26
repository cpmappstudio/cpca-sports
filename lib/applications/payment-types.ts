import type { FeeType } from "./fee-types";

export type PaymentStatus = "pending" | "paid" | "partially_paid";

export type FeePayment = FeeType & {
  status: PaymentStatus;
  paidAmount: number;
  createdAt?: number;
  paidAt?: number;
};

export type PaymentMethod = "cash" | "online";

export type TransactionStatus = "completed" | "pending" | "failed";

export type PaymentTransaction = {
  id: string;
  date: number;
  amount: number;
  feeId: string;
  feeName: string;
  method: PaymentMethod;
  registeredBy?: string;
  status: TransactionStatus;
  reference?: string;
};
