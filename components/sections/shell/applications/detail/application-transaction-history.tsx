"use client";

import { useState, useMemo } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, CalendarIcon } from "lucide-react";
import type {
  PaymentTransaction,
  FeePayment,
} from "@/lib/applications/payment-types";
import { useTranslations } from "next-intl";
import { format, isWithinInterval } from "date-fns";
import { type DateRange } from "react-day-picker";
import { FeeCard } from "./fee-card";

interface ApplicationTransactionHistoryProps {
  transactions: PaymentTransaction[];
  fees: FeePayment[];
}

export function ApplicationTransactionHistory({
  transactions,
  fees,
}: ApplicationTransactionHistoryProps) {
  const t = useTranslations("Applications.transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const paidFees = useMemo(() => {
    const feeMap = new Map(fees.map((fee) => [fee.id, fee]));

    return transactions
      .filter((txn) => {
        const matchesSearch =
          searchQuery === "" ||
          txn.feeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          txn.amount.toString().includes(searchQuery) ||
          (txn.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ??
            false);

        const matchesDateRange =
          !dateRange?.from ||
          !dateRange?.to ||
          isWithinInterval(new Date(txn.date), {
            start: dateRange.from,
            end: dateRange.to,
          });

        return matchesSearch && matchesDateRange;
      })
      .map((txn) => {
        const originalFee = feeMap.get(txn.feeId);
        const fee: FeePayment = {
          id: txn.id,
          name: txn.feeName,
          description: originalFee?.description,
          downPayment: 0,
          totalAmount: txn.amount,
          isRefundable: originalFee?.isRefundable ?? false,
          isIncluded: originalFee?.isIncluded ?? false,
          isDefault: originalFee?.isDefault ?? false,
          isRequired: originalFee?.isRequired ?? false,
          status: "paid",
          paidAmount: txn.amount,
          createdAt: originalFee?.createdAt,
          paidAt: txn.date,
        };
        return {
          fee,
          date: txn.date,
          method: txn.method,
          reference: txn.reference,
        };
      });
  }, [transactions, fees, searchQuery, dateRange]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, typeof paidFees>();

    paidFees.forEach((item) => {
      const monthKey = format(new Date(item.date), "MMMM yyyy");
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(item);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const dateA = new Date(
        paidFees.find((f) => format(new Date(f.date), "MMMM yyyy") === a[0])
          ?.date ?? 0,
      );
      const dateB = new Date(
        paidFees.find((f) => format(new Date(f.date), "MMMM yyyy") === b[0])
          ?.date ?? 0,
      );
      return dateB.getTime() - dateA.getTime();
    });
  }, [paidFees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <InputGroup className="flex-1">
          <InputGroupInput
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start px-2.5 font-normal w-72 shrink-0"
            >
              <CalendarIcon />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>{t("filterDate")}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {groupedByMonth.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">{t("emptyMessage")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByMonth.map(([month, items]) => (
            <div key={month} className="space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-2">
                <h3 className="text-lg font-semibold">{month}</h3>
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? "payment" : "payments"}
                </p>
              </div>
              <div className="space-y-4">
                {items.map((item) => (
                  <FeeCard
                    key={item.fee.id}
                    fee={item.fee}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
