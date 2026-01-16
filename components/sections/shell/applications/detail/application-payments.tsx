"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  DEFAULT_APPLICATION_FEES,
  type FeeType,
} from "@/lib/applications/fee-types";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "paid" | "partially_paid";

type FeePayment = FeeType & {
  status: PaymentStatus;
  paidAmount: number;
};

interface ApplicationPaymentsProps {
  applicationId: string;
  isAdmin: boolean;
}

export function ApplicationPayments({
  applicationId,
  isAdmin,
}: ApplicationPaymentsProps) {
  const [fees, setFees] = useState<FeePayment[]>(
    DEFAULT_APPLICATION_FEES.map((fee) => ({
      ...fee,
      status: "pending" as PaymentStatus,
      paidAmount: 0,
    })),
  );
  const [isAddingFee, setIsAddingFee] = useState(false);
  const [newFee, setNewFee] = useState<Partial<FeeType>>({
    name: "",
    downPayment: 0,
    totalAmount: 0,
    isRefundable: false,
    isIncluded: false,
    isDefault: false,
    isRequired: false,
  });

  const handleAddFee = () => {
    if (!newFee.name || !newFee.totalAmount) return;

    const fee: FeePayment = {
      id: `custom_${Date.now()}`,
      name: newFee.name,
      description: newFee.description,
      downPayment: newFee.downPayment || 0,
      totalAmount: newFee.totalAmount,
      isRefundable: newFee.isRefundable || false,
      isIncluded: newFee.isIncluded || false,
      isDefault: false,
      isRequired: newFee.isRequired || false,
      status: "pending",
      paidAmount: 0,
    };

    setFees([...fees, fee]);
    setNewFee({
      name: "",
      downPayment: 0,
      totalAmount: 0,
      isRefundable: false,
      isIncluded: false,
      isDefault: false,
      isRequired: false,
    });
    setIsAddingFee(false);
  };

  const handleRemoveFee = (feeId: string) => {
    setFees(fees.filter((fee) => fee.id !== feeId));
  };

  const handleUpdateFee = (feeId: string, updates: Partial<FeePayment>) => {
    setFees(
      fees.map((fee) => (fee.id === feeId ? { ...fee, ...updates } : fee)),
    );
  };

  const handleMarkAsPaid = (feeId: string) => {
    const fee = fees.find((f) => f.id === feeId);
    if (!fee) return;

    handleUpdateFee(feeId, {
      status: "paid",
      paidAmount: fee.totalAmount,
    });
  };

  const totalDue = fees.reduce((sum, fee) => sum + fee.totalAmount, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const totalPending = totalDue - totalPaid;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payment Summary</CardTitle>
          <CardDescription>
            Overview of all fees and payments for this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold">${totalDue.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-500/10">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${totalPaid.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-orange-500/10">
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${totalPending.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {fees.map((fee) => (
          <FeeCard
            key={fee.id}
            fee={fee}
            isAdmin={isAdmin}
            onUpdate={handleUpdateFee}
            onRemove={handleRemoveFee}
            onMarkAsPaid={handleMarkAsPaid}
          />
        ))}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Add Custom Fee</CardTitle>
              <Button
                size="sm"
                variant={isAddingFee ? "outline" : "default"}
                onClick={() => setIsAddingFee(!isAddingFee)}
              >
                {isAddingFee ? "Cancel" : <><Plus className="h-4 w-4 mr-2" />Add Fee</>}
              </Button>
            </div>
          </CardHeader>
          {isAddingFee && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fee-name">Fee Name</Label>
                  <Input
                    id="fee-name"
                    placeholder="Enter fee name"
                    value={newFee.name}
                    onChange={(e) =>
                      setNewFee({ ...newFee, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee-description">Description</Label>
                  <Input
                    id="fee-description"
                    placeholder="Optional description"
                    value={newFee.description || ""}
                    onChange={(e) =>
                      setNewFee({ ...newFee, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="down-payment">Down Payment</Label>
                  <Input
                    id="down-payment"
                    type="number"
                    placeholder="0"
                    value={newFee.downPayment}
                    onChange={(e) =>
                      setNewFee({
                        ...newFee,
                        downPayment: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total-amount">Total Amount</Label>
                  <Input
                    id="total-amount"
                    type="number"
                    placeholder="0"
                    value={newFee.totalAmount}
                    onChange={(e) =>
                      setNewFee({
                        ...newFee,
                        totalAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="refundable"
                    checked={newFee.isRefundable}
                    onChange={(e) =>
                      setNewFee({ ...newFee, isRefundable: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="refundable" className="cursor-pointer">
                    Refundable
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="included"
                    checked={newFee.isIncluded}
                    onChange={(e) =>
                      setNewFee({ ...newFee, isIncluded: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="included" className="cursor-pointer">
                    Included
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={newFee.isRequired}
                    onChange={(e) =>
                      setNewFee({ ...newFee, isRequired: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="required" className="cursor-pointer">
                    Required
                  </Label>
                </div>
              </div>
              <Button onClick={handleAddFee} className="w-full">
                Add Fee
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

interface FeeCardProps {
  fee: FeePayment;
  isAdmin: boolean;
  onUpdate: (feeId: string, updates: Partial<FeePayment>) => void;
  onRemove: (feeId: string) => void;
  onMarkAsPaid: (feeId: string) => void;
}

function FeeCard({ fee, isAdmin, onUpdate, onRemove, onMarkAsPaid }: FeeCardProps) {
  const getStatusBadge = () => {
    switch (fee.status) {
      case "paid":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge variant="secondary" className="gap-1">
            <CreditCard className="h-3 w-3" />
            Partially Paid
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        fee.status === "paid" && "border-green-500/50",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{fee.name}</CardTitle>
              {fee.isRequired && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
              {fee.isDefault && (
                <Badge variant="outline" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            {fee.description && (
              <CardDescription className="mt-1 text-sm">
                {fee.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {isAdmin && !fee.isDefault && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onRemove(fee.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              Down Payment
            </Label>
            <p className="text-lg font-semibold">
              ${fee.downPayment.toFixed(2)}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <p className="text-lg font-semibold">
              ${fee.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {fee.paidAmount > 0 && fee.status !== "paid" && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paid so far</span>
              <span className="text-sm font-semibold">
                ${fee.paidAmount.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${(fee.paidAmount / fee.totalAmount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {fee.isRefundable && (
            <Badge variant="outline" className="text-xs">
              Refundable
            </Badge>
          )}
          {fee.isIncluded && (
            <Badge variant="outline" className="text-xs">
              Included
            </Badge>
          )}
        </div>

        {isAdmin && fee.status !== "paid" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => onMarkAsPaid(fee.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
