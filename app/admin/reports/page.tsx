"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useLanguage } from "@/components/language-provider";

type Payment = {
  id: number;
  ticketId: string;
  tenantId: string;
  month: string;
  year: number;
  amount: number;
  paidDate: string | null;
  status: "PAID" | "OVERDUE" | "PARTIAL";
  tenant: { name: string };
  paymentType?: "MONTHLY_RENT" | "GOODWILL";
  deletedAt?: string | null;
  expectedMonthlyRent?: number | null;
  createdAt: string;
};

type Property = {
  property_id: string;
  status: "Available" | "OCCUPIED";
};

type RentedProperty = {
  id: number;
  rent_fee: number | string;
  goodwill_fee: number | string;
  effectiveDate?: string;
  createdAt: string;
};

type Tenant = {
  tenant_id: string;
  status: "PAID" | "DELINQUENT" | "UNPAID" | string;
  rentedProperties?: RentedProperty[];
  total_goodwill_fee?: number | string;
  balance?: number | string;
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthsShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const { t } = useLanguage();

  const { data: paymentsData } = useQuery({
    queryKey: ["payments-all"],
    queryFn: async () => {
      const res = await fetch("/api/payment/payments?limit=1000");
      if (!res.ok) {
        throw new Error("Failed to fetch payments");
      }
      return res.json();
    },
  });

  const { data: propertiesData } = useQuery({
    queryKey: ["properties-all"],
    queryFn: async () => {
      const res = await fetch("/api/property/properties?limit=1000");
      if (!res.ok) {
        throw new Error("Failed to fetch properties");
      }
      return res.json();
    },
  });

  const { data: tenantsData } = useQuery({
    queryKey: ["tenants-all"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/tenants?limit=1000");
      if (!res.ok) {
        throw new Error("Failed to fetch tenants");
      }
      return res.json();
    },
  });

  const payments: Payment[] = paymentsData?.data || [];
  const properties: Property[] = propertiesData?.data || [];
  const tenants: Tenant[] = tenantsData?.data || [];

  const filteredPayments = payments.filter((payment) => {
    let matchesYear = payment.year === Number(selectedYear);
    let matchesMonth = selectedMonth === "all" || payment.month === selectedMonth;
    return matchesYear && matchesMonth && !payment.deletedAt;
  });

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Calculate total unpaid goodwill first
  let totalGoodwillDue = 0;
  for (const tenant of tenants) {
    const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
    if (totalGoodwillFee > 0) {
      const tenantGoodwillPayments = payments.filter(
        p => p.tenantId === tenant.tenant_id &&
        !p.deletedAt &&
        (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee")
      );
      const totalPaidGoodwill = tenantGoodwillPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalGoodwillDue += Math.max(totalGoodwillFee - totalPaidGoodwill, 0);
    }
  }
  
  // Generate monthlyRevenueData - respect selected month filter
  const monthlyRevenueData = monthsShort
    .map((short, i) => {
      const fullMonth = months[i];
      const targetYear = Number(selectedYear);
      
      // If a specific month is selected, skip other months
      if (selectedMonth !== "all" && selectedMonth !== fullMonth) {
        return null;
      }

      const collected = payments
        .filter((p) => {
          if (p.deletedAt) return false;
          
          const paymentDate = new Date(p.createdAt);
          const paymentYear = paymentDate.getFullYear();
          const paymentMonth = paymentDate.getMonth();
          
          // For both monthly rent payments by createdAt
          if (p.paymentType !== "GOODWILL" && p.month !== "Goodwill Fee") {
            return paymentYear === targetYear && paymentMonth === i;
          }
          
          // For goodwill payments, use paidDate or createdAt
          const d = p.paidDate ? new Date(p.paidDate) : new Date(p.createdAt);
          return d.getFullYear() === targetYear && d.getMonth() === i;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Only calculate overdue if month is not in future
      let overdue = 0;
      const isFutureMonth = (targetYear > currentYear) || (targetYear === currentYear && i > currentMonthIndex);
      
      if (!isFutureMonth) {
        const tenantsWithProperties = tenants.filter(
          (t) => t.rentedProperties && t.rentedProperties.length > 0
        );

        for (const tenant of tenantsWithProperties) {
          let expected = 0;
          for (const rp of tenant.rentedProperties || []) {
            const eff = rp.effectiveDate ? new Date(rp.effectiveDate) : new Date(rp.createdAt);
            if (
              targetYear > eff.getFullYear() ||
              (targetYear === eff.getFullYear() && i >= eff.getMonth())
            ) {
              expected += Number(rp.rent_fee) || 0;
            }
          }
          if (expected > 0) {
            const paid = payments
              .filter(
                (p) =>
                  !p.deletedAt &&
                  p.tenantId === tenant.tenant_id &&
                  p.paymentType !== "GOODWILL" &&
                  p.month !== "Goodwill Fee"
              )
              .filter(p => {
                const paymentDate = new Date(p.createdAt);
                return paymentDate.getFullYear() === targetYear && paymentDate.getMonth() === i;
              })
              .reduce((sum, p) => sum + Number(p.amount), 0);
            overdue += Math.max(expected - paid, 0);
          }
        }
        
        // Add unpaid goodwill only on current month
        if (i === currentMonthIndex) {
          overdue += totalGoodwillDue;
        }
      }

      return { name: short, collected, overdue: isFutureMonth ? null : overdue };
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);

  const totalCollected = monthlyRevenueData.reduce((s, m) => s + m.collected, 0);
  
  // Define target year/month index once, used everywhere
  const targetYear = Number(selectedYear);
  const targetMonthIndex = selectedMonth !== "all" ? months.indexOf(selectedMonth) : null;
  
  // Find the current month in the filtered monthlyRevenueData
  let totalOverdue = 0;
  const currentMonthShort = monthsShort[currentMonthIndex];
  const currentMonthData = monthlyRevenueData.find(m => m.name === currentMonthShort);
  if (currentMonthData) {
    totalOverdue = currentMonthData.overdue || 0;
  }

  // Get all unique property IDs that have active rented properties effective in the selected period
  const occupiedPropertyIds = new Set<string>();

  for (const tenant of tenants) {
    for (const rp of tenant.rentedProperties || []) {
      const effectiveDate = new Date(rp.effectiveDate || rp.createdAt);
      const effYear = effectiveDate.getFullYear();
      const effMonth = effectiveDate.getMonth();

      // Check if effective date is in selected period
      let matches = false;
      
      if (selectedMonth === "all") {
        // All months: check if effective year <= selected year and (if same year, effective month <= current month)
        if (effYear < targetYear) {
          matches = true;
        } else if (effYear === targetYear) {
          // For current year, only count up to current month
          const maxMonth = targetYear === currentYear ? currentMonthIndex : 11;
          if (effMonth <= maxMonth) {
            matches = true;
          }
        }
      } else {
        // Specific month: check if effective date <= selected month/year
        if (effYear < targetYear) {
          matches = true;
        } else if (effYear === targetYear && targetMonthIndex !== null && effMonth <= targetMonthIndex) {
          matches = true;
        }
      }

      if (matches) {
        occupiedPropertyIds.add((rp as any).propertyId);
      }
    }
  }

  // Calculate counts
  const occupiedCount = occupiedPropertyIds.size;
  const availableCount = properties.filter(p => !occupiedPropertyIds.has(p.property_id)).length;
  const totalProperties = availableCount + occupiedCount;

  const propertyStatusData = [
    { name: "Occupied", value: occupiedCount },
    { name: "Available", value: availableCount },
  ];

  // Calculate tenant status based on selected filters
  let paidCount = 0;
  let partialCount = 0;
  let delinquentCount = 0; // This is the total delinquent accounts (previously 'Overdue')
  let unpaidCount = 0; // This is accounts with monthly rent remaining balance and/or unpaid goodwill
  
  // First, filter tenants that have rented properties effective in the selected period
  const relevantTenants = tenants.filter(tenant => {
    for (const rp of tenant.rentedProperties || []) {
      const effectiveDate = new Date(rp.effectiveDate || rp.createdAt);
      const effYear = effectiveDate.getFullYear();
      const effMonth = effectiveDate.getMonth();
      
      if (selectedMonth === "all") {
        if (effYear < targetYear) return true;
        if (effYear === targetYear) {
          const maxMonth = targetYear === currentYear ? currentMonthIndex : 11;
          if (effMonth <= maxMonth) return true;
        }
      } else {
        if (targetMonthIndex === null) continue;
        if (effYear < targetYear) return true;
        if (effYear === targetYear && effMonth <= targetMonthIndex) return true;
      }
    }
    return false;
  });
  
  for (const tenant of relevantTenants) {
    // Get total expected rent for this tenant in the selected period
    let expectedRent = 0;
    let totalGoodwill = 0;
    for (const rp of tenant.rentedProperties || []) {
      const effectiveDate = new Date(rp.effectiveDate || rp.createdAt);
      const effYear = effectiveDate.getFullYear();
      const effMonth = effectiveDate.getMonth();
      
      let isRelevant = false;
      if (selectedMonth === "all") {
        if (effYear < targetYear) isRelevant = true;
        if (effYear === targetYear) {
          const maxMonth = targetYear === currentYear ? currentMonthIndex : 11;
          if (effMonth <= maxMonth) isRelevant = true;
        }
      } else {
        if (targetMonthIndex === null) continue;
        if (effYear < targetYear) isRelevant = true;
        if (effYear === targetYear && effMonth <= targetMonthIndex) isRelevant = true;
      }
      
      if (isRelevant) {
        expectedRent += Number(rp.rent_fee || 0);
        totalGoodwill += Number(rp.goodwill_fee || 0);
      }
    }
    
    if (expectedRent <= 0 && totalGoodwill <= 0) continue;
    
    // Get total rent payments for this tenant in the selected period (based on createdAt)
    let totalRentPaid = 0;
    let totalGoodwillPaid = 0;
    for (const p of payments) {
      if (
        p.tenantId === tenant.tenant_id &&
        !p.deletedAt
      ) {
        const paymentDate = new Date(p.createdAt);
        const paymentYear = paymentDate.getFullYear();
        const paymentMonth = paymentDate.getMonth();
        
        let matchesPeriod = false;
        
        if (selectedMonth === "all") {
          // All months in selected year: check if payment year matches target year and month <= current month if current year
          if (paymentYear === targetYear) {
            const maxMonth = targetYear === currentYear ? currentMonthIndex : 11;
            if (paymentMonth <= maxMonth) {
              matchesPeriod = true;
            }
          }
        } else {
          // Specific month: check if payment date is in that month/year
          if (targetMonthIndex !== null && paymentYear === targetYear && paymentMonth === targetMonthIndex) {
            matchesPeriod = true;
          }
        }
        
        if (matchesPeriod) {
          if (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee") {
            totalGoodwillPaid += Number(p.amount);
          } else {
            totalRentPaid += Number(p.amount);
          }
        }
      }
    }
    
    // Calculate balances
    const remainingRent = Math.max(expectedRent - totalRentPaid, 0);
    const remainingGoodwill = Math.max(totalGoodwill - totalGoodwillPaid, 0);
    const hasRemainingBalance = remainingRent > 0 || remainingGoodwill > 0;
    
    // Determine tenant status
    if (totalRentPaid >= expectedRent && totalGoodwillPaid >= totalGoodwill) {
      paidCount++;
    } else if (hasRemainingBalance && totalRentPaid > 0) {
      partialCount++;
    } else {
      // Check if it's overdue (delinquent)
      let isOverdue = false;
      if (selectedMonth !== "all" && targetMonthIndex !== null) {
        const selectedDate = new Date(targetYear, targetMonthIndex, 1);
        const today = new Date();
        if (selectedDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
          isOverdue = true;
        }
      } else if (selectedMonth === "all" && targetYear < currentYear) {
        isOverdue = true;
      }
      
      if (isOverdue) {
        delinquentCount++;
      } else {
        unpaidCount++;
      }
    }
  }

  const tenantStatusData = [
    { name: "Paid", value: paidCount, color: "#15803d" },
    { name: "Unpaid", value: partialCount, color: "#d97706" },
    { name: "Delinquent", value: delinquentCount + unpaidCount, color: "#dc2626" },
  ].filter(item => item.value > 0);

  const handleDownloadExcel = () => {
    try {
      const headers = ["Ticket ID", "Tenant", "Month", "Year", "Payment Type", "Amount", "Status", "Paid Date"];
      const rows = filteredPayments.map((p) => [
        p.ticketId,
        p.tenant.name,
        p.month,
        p.year,
        p.paymentType === "GOODWILL" ? "Goodwill" : "Monthly Rent",
        `$${Number(p.amount).toFixed(2)}`,
        p.status,
        p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "-",
      ]);

      let csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `payments-report-${selectedYear}-${selectedMonth}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("toast.success"));
    } catch (error) {
      toast.error(t("toast.error"));
    }
  };

  const fmt = (n: number) =>
    "$ " + n.toLocaleString("en-US", { minimumFractionDigits: 0 });

  const revenueConfig = {
    collected: { label: t("reports.collected"), color: "#15803d" },
    overdue: { label: t("reports.overdue"), color: "#dc2626" },
  };

  const tenantConfig = Object.fromEntries(
    tenantStatusData.map((t) => [t.name, { label: t.name, color: t.color }])
  );

  return (
    <div className="h-full flex flex-col gap-5">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{t("reports.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("reports.subtitle")}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder={t("reports.selectYear")} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder={t("reports.selectMonth")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reports.allMonths")}</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleDownloadExcel} className="w-full lg:w-auto bg-green-800 text-white">
            {t("button.downloadExcel")}
          </Button>
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t("reports.collected"), value: fmt(totalCollected), color: "text-green-700" },
          { label: t("reports.overdue"), value: fmt(totalOverdue), color: "text-red-500" },
          { label: "Unpaid Goodwill", value: fmt(totalGoodwillDue), color: "text-yellow-600" },
          { label: "Properties", value: String(totalProperties), color: "text-foreground" },
          { label: "Tenants", value: String(relevantTenants.length), color: "text-foreground" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-muted/50 rounded-lg p-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {card.label}
            </p>
            <p className={`text-xl font-medium ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Charts grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Revenue — full width */}
        <div className="md:col-span-2 border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">{t("reports.monthlyRevenue")}</p>
              <p className="text-xs text-muted-foreground">{selectedYear}</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(revenueConfig).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: cfg.color }}
                  />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>
          <div className="w-full aspect-[16/5] transition-all duration-300 ease-in-out">
            <ChartContainer config={revenueConfig} className="h-full w-full transition-all duration-300">
              <BarChart
                data={monthlyRevenueData}
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                barCategoryGap="30%"
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => "$" + Math.round(v / 1000) + "k"}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => fmt(value as number)}
                />
                <Bar dataKey="collected" fill="#15803d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Property Status — donut */}
        <div className="border rounded-lg p-6">
          <div className="mb-4">
            <p className="text-sm font-medium">{t("reports.propertyStatus")}</p>
            <p className="text-xs text-muted-foreground">{totalProperties} total properties</p>
          </div>
          <div className="flex gap-3 mb-4 flex-wrap">
            {propertyStatusData.map((item, i) => (
              <span key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ background: i === 0 ? "#2563eb" : "#6b7280" }}
                />
                {i === 0 ? t("reports.occupied") : t("reports.available")} {item.value}
              </span>
            ))}
          </div>
          <div className="w-full aspect-square max-h-[200px] mx-auto transition-all duration-300 ease-in-out">
            <ChartContainer
              config={{
                Occupied: { label: t("reports.occupied"), color: "#2563eb" },
                Available: { label: t("reports.available"), color: "#6b7280" },
              }}
              className="h-full w-full transition-all duration-300"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  dataKey="value"
                  paddingAngle={2}
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#6b7280" />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </div>

        {/* Tenant Status — horizontal bars */}
        <div className="border rounded-lg p-6">
          <div className="mb-4">
            <p className="text-sm font-medium">{t("reports.tenantStatus")}</p>
            <p className="text-xs text-muted-foreground">{tenants.length} total tenants</p>
          </div>
          <div className="flex gap-3 mb-4 flex-wrap">
            {tenantStatusData.map((t) => (
              <span key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: t.color }} />
                {t.name} {t.value}
              </span>
            ))}
          </div>
          <div className="w-full transition-all duration-300 ease-in-out" style={{ height: `${tenantStatusData.length * 52 + 40}px` }}>
            <ChartContainer config={tenantConfig} className="h-full w-full transition-all duration-300">
              <BarChart
                data={tenantStatusData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {tenantStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
