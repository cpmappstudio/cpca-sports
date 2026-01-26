"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, Clock, CreditCard, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeePayment } from "@/lib/applications/payment-types";
import { format } from "date-fns";

interface FeeCardProps {
  fee: FeePayment;
  isAdmin?: boolean;
  showActions?: boolean;
  onUpdate?: (feeId: string, updates: Partial<FeePayment>) => void;
  onRemove?: (feeId: string) => void;
  onMarkAsPaid?: (feeId: string) => void;
}

export function FeeCard({
  fee,
  isAdmin = false,
  showActions = true,
  onUpdate,
  onRemove,
  onMarkAsPaid,
}: FeeCardProps) {
  const getStatusBadge = () => {
    const dateText =
      fee.status === "paid" && fee.paidAt
        ? format(new Date(fee.paidAt), "MMM d, yyyy")
        : fee.createdAt
          ? format(new Date(fee.createdAt), "MMM d, yyyy")
          : null;

    const tooltipContent = (
      <div className="space-y-1">
        {fee.createdAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Created:</span>{" "}
            {format(new Date(fee.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
        {fee.paidAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Paid:</span>{" "}
            {format(new Date(fee.paidAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </div>
    );

    const statusBadge = (() => {
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
    })();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {statusBadge}
            {dateText && (
              <span className="text-xs text-muted-foreground">{dateText}</span>
            )}
          </div>
        </TooltipTrigger>
        {(fee.createdAt || fee.paidAt) && (
          <TooltipContent>{tooltipContent}</TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        fee.status === "paid" && "border-green-500/50",
      )}
    >
      <CardHeader className="gap-0">
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
            {showActions && isAdmin && !fee.isDefault && onRemove && (
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

        {showActions && isAdmin && fee.status !== "paid" && onMarkAsPaid && (
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
