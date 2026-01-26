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
import { Plus } from "lucide-react";
import { type FeeType } from "@/lib/applications/fee-types";
import type { FeePayment } from "@/lib/applications/payment-types";
import { FeeCard } from "./fee-card";

interface ApplicationPaymentsProps {
  applicationId: string;
  isAdmin: boolean;
  fees: FeePayment[];
  onAddFee: (fee: FeePayment) => void;
  onRemoveFee: (feeId: string) => void;
  onUpdateFee: (feeId: string, updates: Partial<FeePayment>) => void;
  onMarkAsPaid: (feeId: string) => void;
}

export function ApplicationPayments({
  applicationId,
  isAdmin,
  fees,
  onAddFee,
  onRemoveFee,
  onUpdateFee,
  onMarkAsPaid,
}: ApplicationPaymentsProps) {
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

    onAddFee(fee);
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

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader className="gap-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Add Custom Fee</CardTitle>
              <Button
                size="sm"
                variant={isAddingFee ? "outline" : "default"}
                onClick={() => setIsAddingFee(!isAddingFee)}
              >
                {isAddingFee ? (
                  "Cancel"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fee
                  </>
                )}
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

      <div className="space-y-4">
        {fees.filter((fee) => fee.status !== "paid").length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                All fees have been paid. Check the Transaction History tab to
                view payment records.
              </p>
            </CardContent>
          </Card>
        ) : (
          fees
            .filter((fee) => fee.status !== "paid")
            .map((fee) => (
              <FeeCard
                key={fee.id}
                fee={fee}
                isAdmin={isAdmin}
                onUpdate={onUpdateFee}
                onRemove={onRemoveFee}
                onMarkAsPaid={onMarkAsPaid}
              />
            ))
        )}
      </div>
    </div>
  );
}
