"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ellipsis, Check, X, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ADD_PAYMENT_TYPE = {
  MONTHLY_RENT: "monthly_rent",
  GOODWILL_FEE: "goodwill_fee",
};

import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useLanguage } from "@/components/language-provider";


type RentedProperty = {
  business_name: string;
  business_type: string;
  createdAt: string;
  effectiveDate?: string;
  rent_fee: string | number;
};

type Tenant = {
  id: number;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "PAID" | "DELINQUENT" | "PARTIAL";
  total_monthly_rent: number | null;
  total_goodwill_fee: number | null;
  surcharge: number | null;
  interest: number | null;
  dueDate: number | null;
  balance?: number;
  rentedProperties: RentedProperty[];
  createdAt?: string;
};

type Payment = {
  id: number;
  ticketId: string;
  tenantId: string;
  month: string;
  year: number;
  amount: number;
  paidDate: string | null;
  status: "PAID" | "OVERDUE" | "PARTIAL";
  tenant: Tenant;
  paymentType?: "MONTHLY_RENT" | "GOODWILL";
  deletedAt?: string | null;
  surchargePercent?: number | null;
  interestPercent?: number | null;
};

type MonthlyPayment = {
  month: string;
  rent: number;
  surchargePercent: number;
  interestPercent: number;
  surcharge: number;
  interest: number;
  balance: number;
  amountPaid: number;
  initialAmountPaid: number;
  additionalAmount: number;
  paidDate: string | null;
  status: "Paid" | "Partial" | "Unpaid" | "Delinquent";
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PaymentsPage() {
  const [open, setOpen] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    tenantId: "",
    month: "",
    year: new Date().getFullYear().toString(),
    paymentType: "rent" as "rent" | "goodwill",
    paymentMode: "full" as "full" | "partial",
    amount: "",
  });

  const [editForm, setEditForm] = useState({
    month: "",
    year: new Date().getFullYear().toString(),
    amount: "",
    status: "PARTIAL" as "PAID" | "OVERDUE" | "PARTIAL",
    paidDate: "",
    surchargePercent: "",
    interestPercent: "",
  });

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [openGoodwillForm, setOpenGoodwillForm] = useState(false);
  const [goodwillForm, setGoodwillForm] = useState({
    tenantId: "",
    amount: "",
    paymentMode: "full",
  });

  const getRemainingGoodwillForTenant = (tenantId: string) => {
    const tenants = tenantsData?.data || [];
    const payments = paymentsData?.data || [];
    const tenant = tenants.find((t: Tenant) => t.tenant_id === tenantId);
    
    if (!tenant) return 0;
    
    const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
    const goodwillPayments = payments.filter(
      (p: Payment) => p.tenantId === tenantId && p.month === "Goodwill Fee"
    );
    const totalPaidGoodwill = goodwillPayments.reduce(
      (sum: number, p: Payment) => sum + Number(p.amount),
      0
    );
    
    return totalGoodwillFee - totalPaidGoodwill;
  };

  const getEligibleGoodwillTenants = () => {
    const tenants = tenantsData?.data || [];
    const payments = paymentsData?.data || [];
    
    return tenants.filter((t: Tenant) => {
      const totalGoodwillFee = Number(t.total_goodwill_fee) || 0;
      if (!totalGoodwillFee) return false;
      
      const goodwillPayments = payments.filter(
        (p: Payment) => p.tenantId === t.tenant_id && p.month === "Goodwill Fee"
      );
      const totalPaidGoodwill = goodwillPayments.reduce(
        (sum: number, p: Payment) => sum + Number(p.amount),
        0
      );
      
      const remainingGoodwill = totalGoodwillFee - totalPaidGoodwill;
      return remainingGoodwill > 0;
    });
  };

  const getCarryOverBalance = (tenant: Tenant, year: number) => {
    if (year <= new Date(tenant.createdAt || new Date()).getFullYear()) {
      return 0;
    }
    return 0;
  };

  useEffect(() => {
    if (selectedTenant) {
      const loadTenantPayments = async () => {
        try {
          const res = await fetch(`/api/payment/payments?tenantId=${selectedTenant.tenant_id}`);
          const data = await res.json();
          const tenantPayments = data.data || [];
          const yearPayments = tenantPayments.filter((p: any) => p.year === selectedYear);
          
          initializeMonthlyPayments(selectedTenant);
          
          setMonthlyPayments(prev => prev.map(payment => {
            const monthPayments = yearPayments.filter(
              (p: any) => p.month === payment.month && p.paymentType !== "GOODWILL" && p.month !== "Goodwill Fee"
            );
            const totalPaid = monthPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            const lastPaidDate = monthPayments.length > 0 
              ? monthPayments[monthPayments.length - 1].paidDate 
              : null;
            const lastPayment = monthPayments[monthPayments.length - 1];
            
            if (monthPayments.length > 0) {
              return {
                ...payment,
                amountPaid: totalPaid,
                initialAmountPaid: totalPaid,
                paidDate: lastPaidDate,
                surchargePercent: lastPayment.surchargePercent ? Number(lastPayment.surchargePercent) : 0,
                interestPercent: lastPayment.interestPercent ? Number(lastPayment.interestPercent) : 0,
              };
            }
            return payment;
          }));
        } catch (error) {
          console.error("Error loading tenant payments:", error);
          initializeMonthlyPayments(selectedTenant);
        }
      };
      loadTenantPayments();
    }
  }, [selectedTenant, selectedYear]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const monthOptions = months.map((month) => ({
    label: month,
    value: month,
  }));

  const { data: tenantsData } = useQuery({
    queryKey: ["tenants-all"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/tenants?limit=100");
      return res.json();
    },
  });

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", page],
    queryFn: async () => {
      const res = await fetch(`/api/payment/payments?page=${page}&limit=${limit}`);
      return res.json();
    },
  });

  const filteredPayments = (paymentsData?.data || []).filter((payment: Payment) => {
    const matchesSearch =
      !search ||
      payment.tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      payment.ticketId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      status === "all" || payment.status === status;
    const isNotDeleted = !payment.deletedAt;
    return matchesSearch && matchesStatus && isNotDeleted;
  });

  const computeTotalDue = (tenant: Tenant) => {
    const monthlyRent = Number(tenant.total_monthly_rent) || 0;
    const surcharge = Number(tenant.surcharge) || 0;
    const interest = Number(tenant.interest) || 0;
    const balance = Number(tenant.balance) || 0;

    let total = monthlyRent;

    if (tenant.status === "DELINQUENT") {
      total += monthlyRent * surcharge;
      total += monthlyRent * interest;
    }

    total += balance;

    return total;
  };

  const initializeMonthlyPayments = (tenant: Tenant) => {
    const initialPayments: MonthlyPayment[] = months.map((month) => ({
      month,
      rent: 0,
      surchargePercent: 0,
      interestPercent: 0,
      surcharge: 0,
      interest: 0,
      balance: 0,
      amountPaid: 0,
      initialAmountPaid: 0,
      additionalAmount: 0,
      paidDate: null,
      status: "Unpaid" as const,
    }));
    setMonthlyPayments(initialPayments);
  };

  const processMonthlyPayments = (tenant: Tenant, payments: MonthlyPayment[], year: number, carryOverBalance: number = 0) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const dueDay = tenant.dueDate || 1;
    const rentedProperties = tenant.rentedProperties || [];

    let cumulativeBalance = carryOverBalance;
    let surchargeApplied = false;

    return payments.map((payment, index) => {
      let rent = 0;
      let surchargeAmount = 0;
      let interestAmount = 0;
      let status: "Paid" | "Partial" | "Unpaid" | "Delinquent" = "Unpaid";
      let currentBalance = 0;

      for (const property of rentedProperties) {
        const propertyDate = property.effectiveDate ? new Date(property.effectiveDate) : new Date(property.createdAt);
        const propertyStartMonthIndex = propertyDate.getMonth();
        const propertyStartYear = propertyDate.getFullYear();
        
        if (year > propertyStartYear || (year === propertyStartYear && index >= propertyStartMonthIndex)) {
          rent += Number(property.rent_fee) || 0;
        }
      }

      if (rent > 0 || cumulativeBalance > 0) {
        const computedCumulativeBalance = cumulativeBalance + rent;

        if (!surchargeApplied && (rent > 0 || cumulativeBalance > 0)) {
          surchargeAmount = rent * (payment.surchargePercent / 100);
          surchargeApplied = true;
        }
        const computedWithSurcharge = computedCumulativeBalance + surchargeAmount;

        interestAmount = (cumulativeBalance + rent) * (payment.interestPercent / 100);
        const computedWithInterest = computedWithSurcharge + interestAmount;

        currentBalance = computedWithInterest - payment.amountPaid;
        cumulativeBalance = currentBalance;

        // Status logic
        const totalDue = rent + surchargeAmount + interestAmount + (carryOverBalance > 0 ? carryOverBalance : 0);
        const isPaid = payment.amountPaid >= totalDue;
        const isPartial = payment.amountPaid > 0 && !isPaid;
        const dueDateThisMonth = new Date(year, index, dueDay);
        const isPastDue = now > dueDateThisMonth;
        const isFutureMonth = year > currentYear || (year === currentYear && index > currentMonth);

        if (isPaid) {
          status = "Paid";
        } else if (isPartial) {
          status = "Partial";
        } else if (isPastDue && !isPaid && !isPartial) {
          status = "Delinquent";
        } else if (isFutureMonth) {
          status = "Unpaid";
        } else {
          status = "Unpaid";
        }
      }

      return {
        ...payment,
        rent,
        surcharge: surchargeAmount,
        interest: interestAmount,
        balance: currentBalance,
        status,
      };
    });
  };

  const handleSaveMonthlyPayments = async () => {
    if (!selectedTenant) return;

    const loadingToast = toast.loading(t("toast.saving"));

    try {
      const processedPayments = processMonthlyPayments(selectedTenant, monthlyPayments, selectedYear);
      console.log("Processed payments:", processedPayments);
      
      for (let i = 0; i < monthlyPayments.length; i++) {
        const payment = monthlyPayments[i];
        const processedPayment = processedPayments[i];
        const newPaymentAmount = payment.amountPaid - payment.initialAmountPaid;
        console.log("Checking payment for month:", payment.month, "new payment amount:", newPaymentAmount);
        
        if (newPaymentAmount > 0) {
          let status: "PAID" | "OVERDUE" | "PARTIAL" = "PARTIAL";
          if (processedPayment.status === "Paid") {
            status = "PAID";
          } else if (processedPayment.status === "Partial") {
            status = "PARTIAL";
          }
          
          const payload = {
            tenantId: selectedTenant.tenant_id,
            month: payment.month,
            year: selectedYear,
            amount: newPaymentAmount,
            status,
            paidDate: new Date().toISOString(),
            paymentType: "MONTHLY_RENT",
            surchargePercent: payment.surchargePercent,
            interestPercent: payment.interestPercent,
            surchargeAmount: processedPayment.surcharge,
            interestAmount: processedPayment.interest,
          };
          console.log("Sending payload:", payload);
          
          const res = await fetch("/api/payment/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          console.log("Response status:", res.status);
          if (!res.ok) {
            const errorData = await res.json();
            console.error("Failed to save payment for month", payment.month, errorData);
            throw new Error(`Failed to save payment for ${payment.month}: ${errorData.error}`);
          }
          const data = await res.json();
          console.log("Response data:", data);
        }
      }

      // Update initialAmountPaid to the new amountPaid after saving and reset additionalAmount
      setMonthlyPayments(prev => prev.map(p => ({
        ...p,
        initialAmountPaid: p.amountPaid,
        additionalAmount: 0
      })));

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      toast.success(t("toast.success"));
      queryClient.invalidateQueries({ queryKey: ["payments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants-all"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants"], exact: false });
      setOpen(false);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log("error", err);
    }
  };

  const handleCreatePayment = async () => {
    if (!form.tenantId || !form.month || !form.amount) {
      toast.error(t("toast.error"));
      return;
    }

    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("toast.error"));
      return;
    }

    const tenant = (tenantsData?.data || []).find((t: Tenant) => t.tenant_id === form.tenantId);
    if (!tenant) {
      toast.error(t("toast.error"));
      return;
    }

    const totalDue = form.paymentType === "rent" 
      ? computeTotalDue(tenant) 
      : Number(tenant.total_goodwill_fee) || 0;
    
    const status = amountNum < totalDue ? "PARTIAL" : "PAID";

    const loadingToast = toast.loading(t("toast.creating"));

    try {
      const res = await fetch("/api/payment/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: amountNum,
          status,
          paymentType: "MONTHLY_RENT",
        }),
      });

      const data = await res.json();

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(data.error || t("toast.error"));
        return;
      }

      toast.success(t("toast.success"));

      queryClient.invalidateQueries({ queryKey: ["payments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants-all"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants"], exact: false });
      
      setOpenForm(false);
      setForm({
        tenantId: "",
        month: "",
        year: new Date().getFullYear().toString(),
        paymentType: "rent",
        paymentMode: "full",
        amount: "",
      });
      setSelectedTenant(null);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log("error", err);
    }
  };

  const handleCreateGoodwillPayment = async () => {
    if (!goodwillForm.tenantId || !goodwillForm.amount) {
      toast.error(t("toast.error"));
      return;
    }

    const amountNum = Number(goodwillForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("toast.error"));
      return;
    }

    const tenant = (tenantsData?.data || []).find((t: Tenant) => t.tenant_id === goodwillForm.tenantId);
    if (!tenant) {
      toast.error(t("toast.error"));
      return;
    }

    const remainingGoodwill = getRemainingGoodwillForTenant(tenant.tenant_id);

    if (goodwillForm.paymentMode === "full" && amountNum !== remainingGoodwill) {
      toast.error(`Full payment must be exactly $${remainingGoodwill.toFixed(2)}`);
      return;
    }

    if (goodwillForm.paymentMode === "partial" && (amountNum <= 0 || amountNum >= remainingGoodwill)) {
      toast.error(`Partial payment must be greater than 0 and less than $${remainingGoodwill.toFixed(2)}`);
      return;
    }

    const loadingToast = toast.loading(t("toast.creating"));

    try {
      const payments = paymentsData?.data || [];
      const totalGoodwillFee = Number(tenant.total_goodwill_fee) || 0;
      const goodwillPayments = payments.filter(
        (p: Payment) => p.tenantId === tenant.tenant_id && p.month === "Goodwill Fee"
      );
      const totalPaidGoodwill = goodwillPayments.reduce(
        (sum: number, p: Payment) => sum + Number(p.amount),
        0
      );

      const totalAfterPayment = totalPaidGoodwill + amountNum;
      const status = totalAfterPayment < totalGoodwillFee ? "PARTIAL" : "PAID";
      
      const res = await fetch("/api/payment/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: goodwillForm.tenantId,
          month: "Goodwill Fee",
          year: new Date().getFullYear(),
          amount: amountNum,
          status,
          paidDate: new Date().toISOString(),
          paymentType: "GOODWILL",
        }),
      });

      const data = await res.json();

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(data.error || t("toast.error"));
        return;
      }

      toast.success(t("toast.success"));

      queryClient.invalidateQueries({ queryKey: ["payments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants-all"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants"], exact: false });

      setOpenGoodwillForm(false);
      setGoodwillForm({
        tenantId: "",
        amount: "",
        paymentMode: "full",
      });
      setSelectedTenant(null);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log("error", err);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;

    if (!editForm.amount) {
      toast.error(t("toast.error"));
      return;
    }

    const amountNum = Number(editForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("toast.error"));
      return;
    }

    const loadingToast = toast.loading(t("toast.updating"));

    try {
      const res = await fetch(`/api/payment/${selectedPayment.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          amount: amountNum,
          paidDate: editForm.status === "PAID" ? editForm.paidDate || new Date().toISOString() : null,
          surchargePercent: editForm.surchargePercent !== "" ? editForm.surchargePercent : null,
          interestPercent: editForm.interestPercent !== "" ? editForm.interestPercent : null,
        }),
      });

      const data = await res.json();

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(data.error || t("toast.error"));
        return;
      }

      toast.success(t("toast.success"));

      queryClient.invalidateQueries({ queryKey: ["payments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants-all"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants"], exact: false });

      setOpenEditForm(false);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log("error", err);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    setDeleting(true);

    const loadingToast = toast.loading(t("toast.deleting"));

    try {
      const res = await fetch(`/api/payment/${selectedPayment.ticketId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(t("toast.error"));
        return;
      }

      toast.success(t("toast.success"));

      queryClient.invalidateQueries({ queryKey: ["payments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants-all"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tenants"], exact: false });

      setOpenDialog(false);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error(t("toast.error"));
      console.log("error", err);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = paymentsData ? Math.ceil(paymentsData.total / limit) : 1;

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{t("payments.title")}</p>
          <p className="text-sm text-muted-foreground text-wrap">
            {t("payments.subtitle")}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-fit">
          <AlertDialog open={openAddPaymentDialog} onOpenChange={setOpenAddPaymentDialog}>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full lg:w-fit bg-green-800 text-white px-4 py-4 rounded-sm font-medium"
              >
                + {t("button.addPayment")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("payments.addTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("payments.addDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-3 py-4">
                <Button
                  className="w-full bg-green-800 text-white"
                  onClick={() => {
                    setOpenAddPaymentDialog(false);
                    setOpenForm(true);
                  }}
                >
                  {t("payments.monthlyRent")}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setOpenAddPaymentDialog(false);
                    setOpenGoodwillForm(true);
                  }}
                >
                  {t("payments.goodwillFee")}
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative lg:w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder={t("table.loading")}
            className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:max-w-48 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue placeholder={t("table.status")} />
          </SelectTrigger>

          <SelectContent
            position="popper"
            sideOffset={4}
            className="w-fit "
          >
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PAID">{t("payments.paid")}</SelectItem>
              <SelectItem value="PARTIAL">{t("payments.partial")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            {isLoading ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Spinner />
                      {t("table.loading")}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : filteredPayments.length === 0 ? (
              <>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-10 text-muted-foreground"
                    >
                      {t("table.noPayments")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </>
            ) : (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>{t("table.ticketId")}</TableHead>
                    <TableHead>{t("table.tenant")}</TableHead>
                    <TableHead>{t("table.month")}</TableHead>
                    <TableHead>{t("table.year")}</TableHead>
                    <TableHead>{t("table.paymentType")}</TableHead>
                    <TableHead>{t("table.amount")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.paidDate")}</TableHead>
                    <TableHead>{t("table.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: Payment, index: number) => (
                    <TableRow key={payment.ticketId}>
                      <TableCell className="font-medium">
                        {index + 1 + (page - 1) * limit}
                      </TableCell>
                      <TableCell className="font-medium">{payment.ticketId}</TableCell>
                      <TableCell>{payment.tenant.name}</TableCell>
                      <TableCell>
                        {payment.paymentType === "GOODWILL" || payment.month === "Goodwill Fee" ? "-" : payment.month}
                      </TableCell>
                      <TableCell>{payment.year}</TableCell>
                      <TableCell>
                        {payment.paymentType === "GOODWILL" || payment.month === "Goodwill Fee" ? "Goodwill" : "Monthly Rent"}
                      </TableCell>
                      <TableCell>
                        {`$${Number(payment.amount).toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payment.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : payment.status === "OVERDUE"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.paidDate
                          ? new Date(payment.paidDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost">
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent className="">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setOpen(true);
                                }}
                              >
                                {t("payments.view")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setEditForm({
                                    month: payment.month,
                                    year: payment.year.toString(),
                                    amount: payment.amount.toString(),
                                    status: payment.status,
                                    paidDate: payment.paidDate ? payment.paidDate.split("T")[0] : "",
                                    surchargePercent: payment.surchargePercent !== undefined && payment.surchargePercent !== null ? payment.surchargePercent.toString() : "",
                                    interestPercent: payment.interestPercent !== undefined && payment.interestPercent !== null ? payment.interestPercent.toString() : "",
                                  });
                                  setOpenEditForm(true);
                                }}
                              >
                                {t("payments.edit")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setOpenDialog(true);
                                }}
                              >
                                {t("payments.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}
          </Table>
        </div>

        <Pagination className="mt-4 justify-center lg:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={page === i + 1}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className=" overflow-y-auto">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Payment Details
            </SheetTitle>
            <SheetDescription className="text-white">
              View payment information below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            {selectedPayment && (
              <>
                <div className="flex flex-col">
                  <label>Ticket ID</label>
                  <Input
                    value={selectedPayment.ticketId}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Tenant</label>
                  <Input
                    value={selectedPayment.tenant.name}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Month</label>
                  <Input
                    value={selectedPayment.month}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Year</label>
                  <Input
                    value={selectedPayment.year.toString()}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Amount</label>
                  <Input
                    value={`$${Number(selectedPayment.amount).toFixed(2)}`}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Status</label>
                  <Input
                    value={selectedPayment.status}
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Paid Date</label>
                  <Input
                    value={
                      selectedPayment.paidDate
                        ? new Date(selectedPayment.paidDate).toLocaleDateString()
                        : "-"
                    }
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Surcharge Percent</label>
                  <Input
                    value={
                      selectedPayment.surchargePercent !== undefined && selectedPayment.surchargePercent !== null
                        ? `${Number(selectedPayment.surchargePercent).toFixed(2)}%`
                        : "-"
                    }
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>

                <div className="flex flex-col">
                  <label>Interest Percent</label>
                  <Input
                    value={
                      selectedPayment.interestPercent !== undefined && selectedPayment.interestPercent !== null
                        ? `${Number(selectedPayment.interestPercent).toFixed(2)}%`
                        : "-"
                    }
                    className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly
                  />
                </div>
              </>
            )}
          </div>

          <SheetFooter>
            <Button
              onClick={() => {
                setOpen(false);
                setEditForm({
                  month: selectedPayment?.month || "",
                  year: (selectedPayment?.year || new Date().getFullYear()).toString(),
                  amount: selectedPayment?.amount.toString() || "",
                  status: selectedPayment?.status || "PARTIAL",
                  paidDate: selectedPayment?.paidDate ? selectedPayment.paidDate.split("T")[0] : "",
                  surchargePercent: selectedPayment?.surchargePercent !== undefined && selectedPayment?.surchargePercent !== null ? selectedPayment.surchargePercent.toString() : "",
                  interestPercent: selectedPayment?.interestPercent !== undefined && selectedPayment?.interestPercent !== null ? selectedPayment.interestPercent.toString() : "",
                });
                setOpenEditForm(true);
              }}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Edit Payment
            </Button>

            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Drawer open={openForm} onOpenChange={setOpenForm}>
        <DrawerContent className="h-full w-full">
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 bg-muted/50 border-b">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/circle-logo.png"
                  alt="Logo"
                  className="w-12 h-12 mix-blend-multiply"
                />
                <div>
                  <DrawerTitle className="text-xl font-bold">
                    Commercial Real Estate Management System
                  </DrawerTitle>
                  <DrawerDescription>
                    Payment Center
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto w-full px-6 py-6">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">Name</label>
                    <div className="border-b border-gray-300 pb-1">
                      <Select
                        value={form.tenantId}
                        onValueChange={(value) => {
                          setForm({ ...form, tenantId: value });
                          const tenant = (tenantsData?.data || []).find((t: Tenant) => t.tenant_id === value);
                          setSelectedTenant(tenant || null);
                        }}
                      >
                        <SelectTrigger className="border-0 p-0 h-auto w-full">
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenantsData?.data?.map((tenant: Tenant) => (
                            <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-2">Business Name</label>
                    <div className="border-b border-gray-300 pb-2">
                      <span className="text-base">
                        {selectedTenant?.rentedProperties?.[0]?.business_name || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">Year</label>
                    <div className="border-b border-gray-300 pb-1">
                      <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                        <SelectTrigger className="border-0 p-0 h-auto w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const startYear = selectedTenant ? new Date(selectedTenant.createdAt || new Date()).getFullYear() : new Date().getFullYear();
                            const currentYear = new Date().getFullYear();
                            const years: number[] = [];
                            for (let y = startYear; y <= currentYear + 5; y++) {
                              years.push(y);
                            }
                            return years.map(y => (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-2">Due Day</label>
                    <div className="border-b border-gray-300 pb-2">
                      <span className="text-base">
                        {selectedTenant?.dueDate || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 ">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="border-r border-gray-200">Month</TableHead>
                        <TableHead className="border-r border-gray-200">Rent</TableHead>
                        <TableHead className="border-r border-gray-200">Surcharge</TableHead>
                        <TableHead className="border-r border-gray-200">Interest</TableHead>
                        <TableHead className="border-r border-gray-200">Balance</TableHead>
                        <TableHead className="border-r border-gray-200">Amount Paid</TableHead>
                        <TableHead className="border-r border-gray-200">Date</TableHead>
                        <TableHead className="border-r border-gray-200">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    {selectedTenant ? (
                      <TableBody>
                        {(() => {
                          const processedPayments = processMonthlyPayments(selectedTenant, monthlyPayments, selectedYear);
                          const totalPaid = processedPayments.reduce((sum, p) => sum + p.amountPaid, 0);
                          const rentedProperties = selectedTenant.rentedProperties || [];

                          const getActiveRentForMonth = (monthIndex: number) => {
                            let rent = 0;
                            for (const property of rentedProperties) {
                              const propertyDate = property.effectiveDate ? new Date(property.effectiveDate) : new Date(property.createdAt);
                              const propertyStartMonthIndex = propertyDate.getMonth();
                              const propertyStartYear = propertyDate.getFullYear();
                              if (selectedYear > propertyStartYear || (selectedYear === propertyStartYear && monthIndex >= propertyStartMonthIndex)) {
                                rent += Number(property.rent_fee) || 0;
                              }
                            }
                            return rent;
                          };

                          return (
                            <>
                              {processedPayments.map((payment, index) => {
                                const activeRent = getActiveRentForMonth(index);
                                let status: "UNPAID" | "DELINQUENT" | "PAID" | "PARTIAL" = "UNPAID";
                                if (activeRent > 0) {
                                  status = payment.status === "Paid" ? "PAID" : 
                                           payment.status === "Partial" ? "PARTIAL" : 
                                           payment.status === "Delinquent" ? "DELINQUENT" : "UNPAID";
                                }

                                return (
                                  <TableRow key={payment.month}>
                                    <TableCell className="border-r border-gray-200">{payment.month}</TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 ? `$${payment.rent.toFixed(2)}` : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              placeholder="%"
                                              value={monthlyPayments[index].surchargePercent || ""}
                                              onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                const updatedPayments = monthlyPayments.map(p =>
                                                  p.month === payment.month ? { ...p, surchargePercent: value } : p
                                                );
                                                setMonthlyPayments(updatedPayments);
                                              }}
                                              className="w-full"
                                            />
                                            <span className="text-gray-500">%</span>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            ${payment.surcharge.toFixed(2)}
                                          </span>
                                        </div>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              placeholder="%"
                                              value={monthlyPayments[index].interestPercent || ""}
                                              onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                const updatedPayments = monthlyPayments.map(p =>
                                                  p.month === payment.month ? { ...p, interestPercent: value } : p
                                                );
                                                setMonthlyPayments(updatedPayments);
                                              }}
                                              className="w-full"
                                            />
                                            <span className="text-gray-500">%</span>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            ${payment.interest.toFixed(2)}
                                          </span>
                                        </div>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 ? `$${payment.balance.toFixed(2)}` : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex flex-col gap-1">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  placeholder="0.00"
                                                  value={payment.additionalAmount || ""}
                                                  onChange={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    const updatedPayments = monthlyPayments.map(p =>
                                                      p.month === payment.month 
                                                        ? { ...p, additionalAmount: value, amountPaid: p.initialAmountPaid + value }
                                                        : p
                                                    );
                                                    setMonthlyPayments(updatedPayments);
                                                  }}
                                                  className="w-full"
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                  Total Paid: ${(payment.initialAmountPaid + payment.additionalAmount).toFixed(2)}
                                                </span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Remaining Balance: ${payment.balance.toFixed(2)}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      {activeRent > 0 && payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : "-"}
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          status === "PAID"
                                            ? "bg-green-100 text-green-800"
                                            : status === "PARTIAL"
                                            ? "bg-blue-100 text-blue-800"
                                            : status === "DELINQUENT"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {status}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              <TableRow>
                                <TableCell className="border-r border-gray-200 font-semibold">Total Balance</TableCell>
                                <TableCell className="border-r border-gray-200" colSpan={3}></TableCell>
                                <TableCell className="border-r border-gray-200 font-semibold">
                                  ${processedPayments[processedPayments.length - 1]?.balance.toFixed(2) || "0.00"}
                                </TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="border-r border-gray-200 font-semibold">Total Paid</TableCell>
                                <TableCell className="border-r border-gray-200" colSpan={3}></TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                                <TableCell className="border-r border-gray-200 font-semibold">
                                  ${totalPaid.toFixed(2)}
                                </TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                                <TableCell className="border-r border-gray-200"></TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    ) : (
                      <TableBody>
                        <TableRow>
                          <TableCell className="border-r border-gray-200 text-center py-12" colSpan={8}>
                            Select a tenant to view payment schedule
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    )}
                  </Table>
                </div>
              </div>
            </div>
            <DrawerFooter className="p-6 flex-shrink-0 border-t bg-muted/50">
              <Button onClick={handleSaveMonthlyPayments}>Save</Button>
              <DrawerClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Sheet open={openEditForm} onOpenChange={setOpenEditForm}>
        <SheetContent side="right" className=" overflow-y-auto">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Edit Payment
            </SheetTitle>
            <SheetDescription className="text-white">
              Update payment details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-col">
              <label>Month</label>
              <Select
                value={editForm.month}
                onValueChange={(value) => setEditForm({ ...editForm, month: value })}
              >
                <SelectTrigger className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label>Year</label>
              <Input
                type="number"
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="flex flex-col">
              <label>Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="flex flex-col">
              <label>Status</label>
              <Select
                value={editForm.status}
                onValueChange={(value: "PAID" | "OVERDUE" | "PARTIAL") =>
                  setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.status === "PAID" && (
              <div className="flex flex-col">
                <label>Paid Date</label>
                <Input
                  type="date"
                  value={editForm.paidDate}
                  onChange={(e) => setEditForm({ ...editForm, paidDate: e.target.value })}
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                />
              </div>
            )}

            <div className="flex flex-col">
              <label>Surcharge Percent</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.surchargePercent}
                onChange={(e) => setEditForm({ ...editForm, surchargePercent: e.target.value })}
                placeholder="Enter surcharge percent"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="flex flex-col">
              <label>Interest Percent</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.interestPercent}
                onChange={(e) => setEditForm({ ...editForm, interestPercent: e.target.value })}
                placeholder="Enter interest percent"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleUpdatePayment}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Update Payment
            </Button>

            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Drawer open={openGoodwillForm} onOpenChange={setOpenGoodwillForm}>
        <DrawerContent className="h-full w-full">
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 bg-muted/50 border-b">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/circle-logo.png"
                  alt="Logo"
                  className="w-12 h-12 mix-blend-multiply"
                />
                <div>
                  <DrawerTitle className="text-xl font-bold">
                    Commercial Real Estate Management System
                  </DrawerTitle>
                  <DrawerDescription>
                    Payment Center
                  </DrawerDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    Tenant
                  </label>
                  <Select
                    value={goodwillForm.tenantId}
                    onValueChange={(value) => {
                      const tenant = getEligibleGoodwillTenants().find((t: Tenant) => t.tenant_id === value);
                      setSelectedTenant(tenant || null);
                      if (tenant && goodwillForm.paymentMode === "full") {
                        const remaining = getRemainingGoodwillForTenant(tenant.tenant_id);
                        setGoodwillForm({ ...goodwillForm, tenantId: value, amount: remaining.toString() });
                      } else {
                        setGoodwillForm({ ...goodwillForm, tenantId: value, amount: "" });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEligibleGoodwillTenants().map((tenant: Tenant) => (
                        <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedTenant && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Remaining Goodwill Balance: ${getRemainingGoodwillForTenant(selectedTenant.tenant_id).toFixed(2)}
                  </h3>
                </div>
              )}
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto w-full px-6 py-6">
              <div className="space-y-6">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    Payment Mode
                  </label>
                  <Select
                    value={goodwillForm.paymentMode}
                    onValueChange={(value: "full" | "partial") => {
                      if (value === "full" && selectedTenant) {
                        const remaining = getRemainingGoodwillForTenant(selectedTenant.tenant_id);
                        setGoodwillForm({ ...goodwillForm, paymentMode: value, amount: remaining.toString() });
                      } else {
                        setGoodwillForm({ ...goodwillForm, paymentMode: value, amount: "" });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Payment</SelectItem>
                      <SelectItem value="partial">Partial Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={goodwillForm.amount}
                    onChange={(e) => {
                      if (goodwillForm.paymentMode === "partial") {
                        setGoodwillForm({ ...goodwillForm, amount: e.target.value });
                      }
                    }}
                    readOnly={goodwillForm.paymentMode === "full"}
                    placeholder={goodwillForm.paymentMode === "partial" ? "Enter amount" : "Auto-filled"}
                  />
                </div>
              </div>
            </div>
            <DrawerFooter className="p-6 flex-shrink-0 border-t bg-muted/50">
              <Button onClick={handleCreateGoodwillPayment}>
                Add Goodwill Payment
              </Button>
              <DrawerClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the payment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} disabled={deleting}>
              {deleting ? <Spinner className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
