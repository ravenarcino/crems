"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Building2, DollarSign, AlertCircle, FileText, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
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
  status: "AVAILABLE" | "OCCUPIED";
};

type RentedProperty = {
  id: number;
  rent_fee: number | string;
  effectiveDate?: string;
  createdAt: string;
};

type Tenant = {
  tenant_id: string;
  status: "PAID" | "DELINQUENT" | "UNPAID" | string;
  rentedProperties?: RentedProperty[];
  rented_properties?: RentedProperty[];
  total_goodwill_fee?: number | string;
  total_monthly_rent?: number | string;
  balance?: number | string;
  name: string;
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthsShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COLORS = ["#639922", "#E24B4A"];
const PROPERTY_COLORS = ["#185FA5", "#B4B2A9"];

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: paymentsData } = useQuery({
    queryKey: ["payments-all"],
    queryFn: async () => {
      const res = await fetch("/api/payment/payments?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const { data: propertiesData } = useQuery({
    queryKey: ["properties-all"],
    queryFn: async () => {
      const res = await fetch("/api/property/properties?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch properties");
      return res.json();
    },
  });

  const { data: tenantsData } = useQuery({
    queryKey: ["tenants-all"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/tenants?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  const payments: Payment[] = paymentsData?.data || [];
  const properties: Property[] = propertiesData?.data || [];
  const tenants: Tenant[] = tenantsData?.data || [];
  const selectedYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  const tenantsWithProperties = tenants.filter(t => (t.rentedProperties && t.rentedProperties.length > 0) || (t.rented_properties && t.rented_properties.length > 0));

  const monthlyRevenueData = monthsShort.map((short, i) => {
    const fullMonth = months[i];
    const targetYear = selectedYear;

    // Calculate collected amount for this month
    const collected = payments
      .filter((p) => {
        if (p.deletedAt || p.year !== targetYear) return false;
        if (p.month === fullMonth) return true;
        if (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee") {
          const d = p.paidDate ? new Date(p.paidDate) : new Date(p.createdAt);
          return d.getFullYear() === targetYear && d.getMonth() === i;
        }
        return false;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate overdue only if month is not in future
    let monthlyOverdue = 0;
    const isFutureMonth = (targetYear > new Date().getFullYear()) || (targetYear === new Date().getFullYear() && i > currentMonthIndex);
    
    if (!isFutureMonth) {
      // 1. Delinquent Rent for this month
      let delinquentRent = 0;
      tenantsWithProperties.forEach(tenant => {
        let expected = 0;
        const rentedProps = tenant.rentedProperties || tenant.rented_properties || [];
        for (const rp of rentedProps) {
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
                p.year === targetYear &&
                p.month === fullMonth &&
                !p.deletedAt &&
                p.tenantId === tenant.tenant_id &&
                p.paymentType !== "GOODWILL" &&
                p.month !== "Goodwill Fee"
            )
            .reduce((sum, p) => sum + Number(p.amount), 0);
          delinquentRent += Math.max(expected - paid, 0);
        }
      });
      
      // Add Unpaid Goodwill only to current month
      let unpaidGoodwill = 0;
      if (i === currentMonthIndex) {
        for (const tenant of tenants) {
          const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
          if (totalGoodwillFee > 0) {
            const tenantGoodwillPayments = payments.filter(
              (p: any) => p.tenantId === tenant.tenant_id &&
              !p.deletedAt &&
              (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee")
            );
            const totalPaidGoodwill = tenantGoodwillPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            unpaidGoodwill += Math.max(totalGoodwillFee - totalPaidGoodwill, 0);
          }
        }
      }
      
      monthlyOverdue = delinquentRent + unpaidGoodwill;
    }

    return { name: short, collected, overdue: isFutureMonth ? null : monthlyOverdue };
  });

  const totalCollected = monthlyRevenueData.reduce((s, m) => s + m.collected, 0);

  // Calculate total overdue from current month's data
  const totalOverdue = monthlyRevenueData.find((_, i) => i === currentMonthIndex)?.overdue || 0;
  
  // Calculate total overdue goodwill across all tenants
  let totalOverdueGoodwill = 0;
  for (const tenant of tenants) {
    const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
    if (totalGoodwillFee > 0) {
      const tenantGoodwillPayments = payments.filter(
        (p: any) => p.tenantId === tenant.tenant_id &&
        !p.deletedAt &&
        (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee")
      );
      const totalPaidGoodwill = tenantGoodwillPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      totalOverdueGoodwill += Math.max(totalGoodwillFee - totalPaidGoodwill, 0);
    }
  }
  const availableCount = properties.filter((p) => p.status === "AVAILABLE").length;
  const occupiedCount = properties.filter((p) => p.status === "OCCUPIED").length;
  const totalProperties = properties.length;
  // Calculate all pending compliance items (multiple per tenant possible)
  const pendingComplianceItems = tenants.flatMap(tenant => {
    const items = [];
    
    // Get rented properties from either camelCase or snake_case
    const rentedProps = tenant.rentedProperties || tenant.rented_properties || [];
    
    // Calculate unpaid rent
    let unpaidRent = 0;
    if (rentedProps.length > 0) {
      let expectedRent = 0;
      for (const rp of rentedProps) {
        const eff = rp.effectiveDate ? new Date(rp.effectiveDate) : new Date(rp.createdAt);
        if (
          selectedYear > eff.getFullYear() ||
          (selectedYear === eff.getFullYear() && currentMonthIndex >= eff.getMonth())
        ) {
          expectedRent += Number(rp.rent_fee) || 0;
        }
      }
      if (expectedRent > 0) {
        const paidRent = payments
          .filter(
            (p) =>
              p.year === selectedYear &&
              p.month === months[currentMonthIndex] &&
              !p.deletedAt &&
              p.tenantId === tenant.tenant_id &&
              p.paymentType !== "GOODWILL" &&
              p.month !== "Goodwill Fee"
          )
          .reduce((sum, p) => sum + Number(p.amount), 0);
        unpaidRent = Math.max(expectedRent - paidRent, 0);
      }
    }
    
    // Calculate unpaid goodwill
    let unpaidGoodwill = 0;
    const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
    if (totalGoodwillFee > 0) {
      const tenantGoodwillPayments = payments.filter(
        (p: any) => p.tenantId === tenant.tenant_id &&
        !p.deletedAt &&
        (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee")
      );
      const totalPaidGoodwill = tenantGoodwillPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      );
      unpaidGoodwill = Math.max(totalGoodwillFee - totalPaidGoodwill, 0);
    }
    
    // Calculate remaining partial payment balance (only current month)
    let partialBalance = 0;
    
    // Get all current month rent payments (any status)
    const currentMonthRentPayments = payments.filter(p => 
      !p.deletedAt && 
      p.tenantId === tenant.tenant_id && 
      p.year === selectedYear &&
      p.month === months[currentMonthIndex] &&
      p.paymentType !== "GOODWILL" &&
      p.month !== "Goodwill Fee"
    );
    
    const totalPaidCurrentMonth = currentMonthRentPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    
    // Find expected rent
    let expectedRent = 0;
    if (rentedProps.length > 0) {
      for (const rp of rentedProps) {
        const eff = rp.effectiveDate ? new Date(rp.effectiveDate) : new Date(rp.createdAt);
        if (
          selectedYear > eff.getFullYear() ||
          (selectedYear === eff.getFullYear() && currentMonthIndex >= eff.getMonth())
        ) {
          expectedRent += Number(rp.rent_fee) || 0;
        }
      }
    }
    
    // Also check if any payment has expectedMonthlyRent set
    const paymentWithExpectedRent = currentMonthRentPayments.find(p => p.expectedMonthlyRent != null);
    if (paymentWithExpectedRent && Number(paymentWithExpectedRent.expectedMonthlyRent) > 0) {
      expectedRent = Number(paymentWithExpectedRent.expectedMonthlyRent);
    }
    
    partialBalance = Math.max(0, expectedRent - totalPaidCurrentMonth);
    
    // Check if we have partial goodwill (some paid, some unpaid)
    const hasPartialGoodwill = (Number(tenant.total_goodwill_fee) || 0) > 0 && unpaidGoodwill > 0 && unpaidGoodwill < (Number(tenant.total_goodwill_fee) || 0);
    
    // Add items for each applicable status
    
    // Partial Goodwill
    if (hasPartialGoodwill) {
      items.push({
        ...tenant,
        unpaidRent,
        unpaidGoodwill,
        partialBalance,
        totalPaidCurrentMonth,
        expectedRent,
        displayStatus: 'Partial Goodwill',
        statusColor: '#b45309',
        statusBg: '#fed7aa',
        statusAmount: unpaidGoodwill
      });
    }
    
    // Unpaid Goodwill
    if (unpaidGoodwill > 0 && !hasPartialGoodwill) {
      items.push({
        ...tenant,
        unpaidRent,
        unpaidGoodwill,
        partialBalance,
        totalPaidCurrentMonth,
        expectedRent,
        displayStatus: 'Unpaid Goodwill',
        statusColor: '#ca8a04',
        statusBg: '#fef9c3',
        statusAmount: unpaidGoodwill
      });
    }
    
    // Partial Rent
    if (totalPaidCurrentMonth > 0 && partialBalance > 0) {
      items.push({
        ...tenant,
        unpaidRent,
        unpaidGoodwill,
        partialBalance,
        totalPaidCurrentMonth,
        expectedRent,
        displayStatus: 'Partial Rent',
        statusColor: '#d97706',
        statusBg: '#fef3c7',
        statusAmount: partialBalance
      });
    }
    
    // Delinquent
    if (tenant.status?.toUpperCase() === 'DELINQUENT') {
      items.push({
        ...tenant,
        unpaidRent,
        unpaidGoodwill,
        partialBalance,
        totalPaidCurrentMonth,
        expectedRent,
        displayStatus: 'Delinquent',
        statusColor: '#dc2626',
        statusBg: '#fee2e2',
        statusAmount: Number(tenant.total_monthly_rent) || 0
      });
    }
    
    // Unpaid Rent
    if (unpaidRent > 0 && tenant.status?.toUpperCase() !== 'DELINQUENT') {
      items.push({
        ...tenant,
        unpaidRent,
        unpaidGoodwill,
        partialBalance,
        totalPaidCurrentMonth,
        expectedRent,
        displayStatus: 'Unpaid Rent',
        statusColor: '#6366f1',
        statusBg: '#e0e7ff',
        statusAmount: unpaidRent
      });
    }

    // Debug log
    console.log('Tenant:', tenant.name, 'Items:', items.length);
    
    return items;
  });
  
  // We already have all items, no need to filter
  const delinquentAndUnpaidTenants = pendingComplianceItems;
  
  // Calculate total delinquent amount
  const totalDelinquentAmount = delinquentAndUnpaidTenants.reduce((sum, tenant: any) => {
    return sum + tenant.statusAmount;
  }, 0);

  const propertyStatusData = [
    { name: "Occupied", value: occupiedCount },
    { name: "Available", value: availableCount },
  ];

  const fmt = (n: number) =>
    "$ " + n.toLocaleString("en-US", { minimumFractionDigits: 0 });

  const handleFilterDelinquent = async () => {
    const loadingToast = toast.loading(t("toast.loading"));
    try {
      const res = await fetch("/api/tenant/filter-delinquent", {
        method: "POST",
      });
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      if (res.ok) {
        toast.success(t("toast.success"));
        queryClient.invalidateQueries({
          queryKey: ["tenants"],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["tenants-all"],
          exact: false,
        });
      } else {
        toast.error(t("toast.error"));
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log(err);
    }
  };

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{t("dashboard.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
          <Button
            onClick={handleFilterDelinquent}
            className="w-full lg:w-fit bg-gray-300 text-black px-4 py-4 rounded-sm font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("button.filterDelinquent")}
          </Button>

          <Button
            onClick={() => router.push("/admin/tenants")}
            className="w-full lg:w-fit bg-green-800 text-white px-4 py-4 rounded-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("button.addTenant")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push("/admin/payments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalCollected")}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{fmt(totalCollected)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push("/admin/tenants")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalOverdue")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(totalOverdue)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push("/admin/tenants")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.unpaidGoodwill")}</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{fmt(totalOverdueGoodwill)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push("/admin/properties")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalProperties")}</CardTitle>
            <Building2 className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalProperties}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push("/admin/tenants")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalTenants")}</CardTitle>
            <Users className="h-4 w-4 text-purple-700" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenants.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue & Overdue Chart */}
        <Card className="lg:col-span-2 border-0 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{t("dashboard.monthlyRevenue")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedYear}</p>
            </div>
          </div>
          <div className="w-full h-[250px]">
            <ChartContainer
              config={{
                collected: { label: t("reports.collected"), color: "#013b1bff" },
                overdue: { label: t("reports.overdue"), color: "#02ac18ff" },
              }}
              className="h-full w-full"
            >
              <LineChart
                data={monthlyRevenueData}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 13, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  tick={{ fontSize: 13, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => "$" + Math.round(v / 1000) + "k"}
                  tickMargin={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "#e5e7eb" }} />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="#013b1bff"
                  strokeWidth={3}
                  dot={{ fill: "#013b1bff", r: 4, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#013b1bff" }}
                />
                <Line
                  type="monotone"
                  dataKey="overdue"
                  stroke="#E24B4A"
                  strokeWidth={3}
                  dot={{ fill: "#E24B4A", r: 4, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#E24B4A" }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </Card>

        {/* Property Status Donut Chart */}
        <Card className="border-0  p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">{t("dashboard.propertyStatus")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{totalProperties} {t("dashboard.totalProperties").toLowerCase()}</p>
          </div>
          <div className="w-full aspect-square max-h-[240px] mx-auto">
            <ChartContainer
              config={{
                Occupied: { label: t("reports.occupied"), color: "#013b1bff" },
                Available: { label: t("reports.available"), color: "#02ac18ff" },
              }}
              className="h-full w-full"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="90%"
                  dataKey="value"
                  paddingAngle={4}
                >
                  <Cell fill="#02ac18ff" />
                  <Cell fill="#013b1bff" />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          <div className="flex gap-6 mt-6 justify-center">
            {propertyStatusData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ background: i === 0 ? "#02ac18ff" : "#013b1bff" }}
                />
                <span className="text-sm font-medium">{i === 0 ? t("reports.occupied") : t("reports.available")} <span className="text-muted-foreground">{item.value}</span></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Delinquent & Unpaid Tenants Container */}
        <Card className="lg:col-span-3 border-0  p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{t("dashboard.pendingCompliance")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{delinquentAndUnpaidTenants.length} total</p>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {delinquentAndUnpaidTenants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No delinquent or unpaid tenants</p>
              </div>
            ) : (
              delinquentAndUnpaidTenants.map((tenant: any) => {
                // Render debug log as requested
                console.log(
                  "Rendering tenant:",
                  tenant.name,
                  "displayStatus:",
                  tenant.displayStatus,
                  "statusAmount:",
                  tenant.statusAmount
                );
                return (
                  <div key={`${tenant.tenant_id}-${tenant.displayStatus}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center" 
                        style={{ backgroundColor: tenant.statusBg }}
                      >
                        <span 
                          className="font-bold" 
                          style={{ color: tenant.statusColor }}
                        >
                          {tenant.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">Tenant ID: {tenant.tenant_id}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-semibold" 
                        style={{ 
                          backgroundColor: tenant.statusBg,
                          color: tenant.statusColor
                        }}
                      >
                        {tenant.displayStatus}
                      </span>
                      {tenant.statusAmount > 0 && (
                        <p className="text-sm font-semibold" style={{ color: tenant.statusColor }}>
                          {fmt(tenant.statusAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {delinquentAndUnpaidTenants.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Total Delinquent Amount</p>
                <p className="text-lg font-bold text-red-600">{fmt(totalDelinquentAmount)}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
