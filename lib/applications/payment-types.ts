import { Id } from "@/convex/_generated/dataModel";

export type PaymentMethod = "online" | "cash" | "wire";

export type TransactionStatus = "pending" | "completed" | "failed";

export type Transaction = {
  _id: Id<"transactions">;
  _creationTime: number;
  applicationId: Id<"applications">;
  feeId: Id<"fees">;
  amount: number; // In cents
  method: PaymentMethod;
  status: TransactionStatus;
  squarePaymentId?: string;
  squareOrderId?: string;
  reference?: string;
  registeredBy?: Id<"users">;
  createdAt: number;
  completedAt?: number;
};

export type TransactionWithFee = {
  transaction: Transaction;
  feeName: string;
  feeDescription?: string;
};

export type FeeSummary = {
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  feeCount: number;
  paidCount: number;
};
