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
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/components/language-provider";

type Property = {
  id: string;
  property_id: string;
  property_name: string;
  building_name: string;
  area: number;
  rent_fee: number;
  goodwill_fee: number;
  status: string;
};

type RentedProperty = {
  property: Property;
  business_name: string;
  business_type: string;
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
  rentedProperties: RentedProperty[];
};

export default function TenantPage() {
  const [open, setOpen] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openEditForm, setOpenEditForm] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRecordLease, setOpenRecordLease] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [newLeasePropertyId, setNewLeasePropertyId] = useState<string>("");
  const [newLeaseEffectiveDate, setNewLeaseEffectiveDate] = useState<string>("");
  const limit = 10;
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    business_name: "",
    business_type: "",
    dueDate: "",
    interest: "",
    surcharge: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "PAID" as "PAID" | "DELINQUENT" | "PARTIAL",
    business_name: "",
    business_type: "",
    dueDate: "",
    interest: "",
    surcharge: "",
  });
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Property selection for create form
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Property selection for edit form
  const [editSelectedPropertyIds, setEditSelectedPropertyIds] = useState<string[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Fetch properties for multi-select
  const { data: propertiesData } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await fetch("/api/property/properties");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      return json;
    },
  });

  const properties: Property[] = propertiesData?.data ?? [];

  // Fetch all payments
  const { data: paymentsData } = useQuery({
    queryKey: ["payments-all"],
    queryFn: async () => {
      const res = await fetch("/api/payment/payments?limit=1000");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      return json;
    },
  });
  const payments = paymentsData?.data ?? [];

  const handleCreateTenant = async () => {
    // Validation
    if (!form.name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.email.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.email.includes("@")) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.email.includes("gmail.com")) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.phone.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.address.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.business_name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.business_type.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (selectedPropertyIds.length === 0) {
      toast.error(t("toast.error"));
      return;
    }

    const loadingToast = toast.loading(t("toast.creating"));

    try {
      // Calculate totals from selected properties
      const selectedProperties = properties.filter((p) =>
        selectedPropertyIds.includes(p.property_id),
      );
      const totalMonthlyRent = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.rent_fee.toString()) || 0),
        0,
      );
      const totalGoodwillFee = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.goodwill_fee.toString()) || 0),
        0,
      );

      const res = await fetch("/api/tenant/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propertyIds: selectedPropertyIds,
          total_monthly_rent: totalMonthlyRent || null,
          total_goodwill_fee: totalGoodwillFee || null,
          dueDate: form.dueDate ? Number(form.dueDate) : null,
          interest: form.interest ? parseFloat(form.interest) : null,
          surcharge: form.surcharge ? parseFloat(form.surcharge) : null,
        }),
      });

      const data = await res.json();

      // delay AFTER response (for UX)
      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(t("toast.error"));
        console.log("Error: ", data?.error);
        return;
      }

      toast.success(t("toast.success"));

      setOpenForm(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        business_name: "",
        business_type: "",
        dueDate: "",
        interest: "",
        surcharge: "",
      });
      setSelectedPropertyIds([]);

      queryClient.invalidateQueries({
        queryKey: ["tenants"],
        exact: false,
      });
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);
      toast.error("Something went wrong");
      console.log("error", err);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/tenant/tenants?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error);

      return json;
    },
  });

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;

    const loadingToast = toast.loading(t("toast.deleting"));

    setDeleting(true);

    try {
      const res = await fetch(`/api/tenant/${selectedTenant.tenant_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      // UX delay (same pattern as create)
      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(t("toast.error"));
        console.log("Error:", data);
        return;
      }

      toast.success(t("toast.success"));

      setOpenDialog(false);
      setSelectedTenant(null);
      setDeleting(false);

      queryClient.invalidateQueries({
        queryKey: ["tenants"],
        exact: false,
      });
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);

      toast.error("Something went wrong");
      console.log("error", err);
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;

    // Validation
    if (!editForm.name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.email.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.email.includes("@")) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.email.includes("gmail.com")) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.address.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.business_name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!editForm.business_type.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (editSelectedPropertyIds.length === 0) {
      toast.error(t("toast.error"));
      return;
    }

    const loadingToast = toast.loading(t("toast.updating"));

    try {
      // Calculate totals from selected properties
      const selectedProperties = properties.filter((p) =>
        editSelectedPropertyIds.includes(p.property_id),
      );
      const totalMonthlyRent = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.rent_fee.toString()) || 0),
        0,
      );
      const totalGoodwillFee = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.goodwill_fee.toString()) || 0),
        0,
      );

      const res = await fetch(`/api/tenant/${selectedTenant.tenant_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editForm,
          propertyIds: editSelectedPropertyIds,
          total_monthly_rent: totalMonthlyRent || null,
          total_goodwill_fee: totalGoodwillFee || null,
          dueDate: editForm.dueDate ? Number(editForm.dueDate) : null,
          interest: editForm.interest ? parseFloat(editForm.interest) : null,
          surcharge: editForm.surcharge ? parseFloat(editForm.surcharge) : null,
        }),
      });

      const data = await res.json();

      // UX delay (same as create/delete)
      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(t("toast.error"));
        console.log("Error:", data);
        return;
      }

      toast.success(t("toast.success"));

      setOpenEditForm(false);
      setSelectedTenant(null);

      queryClient.invalidateQueries({
        queryKey: ["tenants"],
        exact: false,
      });
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);

      toast.error("Something went wrong");
      console.log("error", err);
    }
  };

  const handleRecordNewLease = async () => {
    if (!selectedTenant || !newLeasePropertyId) {
      toast.error(t("toast.error"));
      return;
    }

    const loadingToast = toast.loading(t("toast.creating"));

    try {
      const currentPropertyIds = selectedTenant.rentedProperties.map(rp => rp.property.property_id);
      const newPropertyIds = [...currentPropertyIds, newLeasePropertyId];

      const selectedProperties = properties.filter((p) =>
        newPropertyIds.includes(p.property_id),
      );
      const totalMonthlyRent = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.rent_fee.toString()) || 0),
        0,
      );
      const totalGoodwillFee = selectedProperties.reduce(
        (sum, p) => sum + (parseFloat(p.goodwill_fee.toString()) || 0),
        0,
      );

      const res = await fetch(`/api/tenant/${selectedTenant.tenant_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedTenant.name,
          email: selectedTenant.email,
          phone: selectedTenant.phone,
          address: selectedTenant.address,
          status: selectedTenant.status,
          business_name: selectedTenant.rentedProperties[0]?.business_name || "",
          business_type: selectedTenant.rentedProperties[0]?.business_type || "",
          dueDate: selectedTenant.dueDate ? selectedTenant.dueDate.toString() : "",
          interest: selectedTenant.interest ? selectedTenant.interest.toString() : "",
          surcharge: selectedTenant.surcharge ? selectedTenant.surcharge.toString() : "",
          propertyIds: newPropertyIds,
          total_monthly_rent: totalMonthlyRent || null,
          total_goodwill_fee: totalGoodwillFee || null,
          effectiveDate: newLeaseEffectiveDate,
        }),
      });

      const data = await res.json();

      await new Promise((r) => setTimeout(r, 1500));

      toast.dismiss(loadingToast);

      if (!res.ok) {
        toast.error(t("toast.error"));
        console.log("Error:", data);
        return;
      }

      toast.success(t("toast.success"));

      setOpenRecordLease(false);
      setNewLeasePropertyId("");
      setNewLeaseEffectiveDate("");
      setSelectedTenant(null);

      queryClient.invalidateQueries({
        queryKey: ["tenants"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["properties"],
        exact: false,
      });
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      toast.dismiss(loadingToast);

      toast.error("Something went wrong");
      console.log("error", err);
    }
  };

  const tenants: Tenant[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      status === "all" || t.status.toLowerCase() === status.toLowerCase();

    return matchSearch && matchStatus;
  });

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId],
    );
  };

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{t("tenants.title")}</p>
          <p className="text-sm text-muted-foreground text-wrap">
            {t("tenants.subtitle")}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-fit">
          <Button
            onClick={async () => {
              const loadingToast = toast.loading(t("toast.updating"));
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
                } else {
                  toast.error(t("toast.error"));
                }
              } catch (err) {
                await new Promise((r) => setTimeout(r, 1500));
                toast.dismiss(loadingToast);
                toast.error(t("toast.error"));
                console.log(err);
              }
            }}
            className="w-full lg:w-fit bg-gray-300 text-black px-4 py-4 rounded-sm font-medium "
          >
            <RefreshCw />
            {t("button.filterDelinquent")}
          </Button>
          <Button
            onClick={() => setOpenForm(true)}
            className="w-full lg:w-fit bg-green-800 text-white px-4 py-4 rounded-sm font-medium "
          >
            + {t("button.addTenant")}
          </Button>
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
              <SelectItem value="PAID">{t("reports.paid")}</SelectItem>
              <SelectItem value="DELINQUENT">{t("reports.delinquent")}</SelectItem>
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
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Spinner />
                      {t("table.loading")}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : tenants.length === 0 ? (
              <>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No tenants found
                    </TableCell>
                  </TableRow>
                </TableBody>
              </>
            ) : (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>{t("tenants.tenantId")}</TableHead>
                    <TableHead>{t("tenants.name")}</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{t("tenants.phone")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("tenants.totalMonthlyRent")}</TableHead>
                    <TableHead>{t("tenants.totalGoodwillFee")}</TableHead>
                    <TableHead>{t("table.action")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTenants.map((tenant, index) => (
                    <TableRow
                      key={tenant.tenant_id}
                      className={tenant.status === "DELINQUENT" ? "bg-red-50 dark:bg-red-950/30" : ""}
                    >
                      <TableCell className="font-medium">
                        {index + 1 + (page - 1) * limit}
                      </TableCell>

                      <TableCell className="font-medium">
                        {tenant.tenant_id}
                      </TableCell>

                      <TableCell>{tenant.name}</TableCell>

                      <TableCell>{tenant.email}</TableCell>

                      <TableCell>{tenant.phone}</TableCell>

                      <TableCell>{tenant.status}</TableCell>

                      <TableCell>
                        {tenant.total_monthly_rent
                          ? `$${Number(tenant.total_monthly_rent).toFixed(2)}`
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {tenant.total_goodwill_fee ? (() => {
                          const totalGoodwillFee = Number(tenant.total_goodwill_fee);
                          const tenantGoodwillPayments = payments.filter(
                            (p: any) => p.tenantId === tenant.tenant_id &&
                            !p.deletedAt &&
                            (p.paymentType === "GOODWILL" || p.month === "Goodwill Fee")
                          );
                          const totalPaidGoodwill = tenantGoodwillPayments.reduce(
                            (sum: number, p: any) => sum + Number(p.amount),
                            0
                          );
                          const isPaid = totalPaidGoodwill >= totalGoodwillFee;
                          return (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                isPaid
                                  ? "bg-green-100 text-green-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              ${totalGoodwillFee.toFixed(2)}
                            </span>
                          );
                        })() : "-"}
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
                                setSelectedTenant(tenant);
                                setNewLeasePropertyId("");
                                setNewLeaseEffectiveDate("");
                                setOpenRecordLease(true);
                              }}
                            >
                                Record New Lease
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setOpen(true);
                                }}
                              >
                                {t("tenants.view")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  const currentPropertyIds = tenant.rentedProperties.map(rp => rp.property.property_id);
                                  setEditForm({
                                    name: tenant.name,
                                    email: tenant.email,
                                    phone: tenant.phone,
                                    address: tenant.address,
                                    status: tenant.status,
                                    business_name: tenant.rentedProperties[0]?.business_name || "",
                                    business_type: tenant.rentedProperties[0]?.business_type || "",
                                    dueDate: tenant.dueDate ? tenant.dueDate.toString() : "",
                                    interest: tenant.interest ? tenant.interest.toString() : "",
                                    surcharge: tenant.surcharge ? tenant.surcharge.toString() : "",
                                  });
                                  setEditSelectedPropertyIds(currentPropertyIds);
                                  setOpenEditForm(true);
                                }}
                              >
                                {t("tenants.edit")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setOpenDialog(true);
                                }}
                              >
                                {t("tenants.delete")}
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

      <Sheet open={openForm} onOpenChange={setOpenForm}>
        <SheetContent side="right" className=" overflow-y-scroll">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Add New Tenant
            </SheetTitle>
            <SheetDescription className="text-white">
              Fill in tenant details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-col">
              <label>Name</label>
              <Input
                type="name"
                placeholder="Tenant Name"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Email</label>
              <Input
                placeholder="Email"
                type="email"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Phone</label>
              <Input
                type="number"
                placeholder="Phone"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Address</label>
              <Input
                type="name"
                placeholder="Address"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Business Name</label>
              <Input
                placeholder="Business Name"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Business Type</label>
              <Input
                placeholder="Business Type"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium">Select Properties</label>
              <div className="border rounded-md p-3 max-h-30 overflow-y-scroll">
                {properties.filter(p => p.status === "AVAILABLE").length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No properties available
                  </p>
                ) : (
                  properties
                    .filter(p => p.status === "AVAILABLE")
                    .map((property) => (
                      <div
                        key={property.property_id}
                        className="flex items-center gap-2 py-2"
                      >
                        <Checkbox
                          id={`property-${property.property_id}`}
                          checked={selectedPropertyIds.includes(
                            property.property_id,
                          )}
                          onCheckedChange={() =>
                            togglePropertySelection(property.property_id)
                          }
                        />
                        <label
                          htmlFor={`property-${property.property_id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {property.property_name} - {property.building_name}
                          <span className="text-muted-foreground text-xs ml-2">
                            (Rent: ${Number(property.rent_fee).toFixed(2)},
                            Goodwill: ${Number(property.goodwill_fee).toFixed(2)})
                          </span>
                        </label>
                      </div>
                    ))
                )}
              </div>
              {selectedPropertyIds.length > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded">
                  <div>
                    Total Monthly Rent: $
                    {properties
                      .filter((p) =>
                        selectedPropertyIds.includes(p.property_id),
                      )
                      .reduce(
                        (sum, p) =>
                          sum + (parseFloat(p.rent_fee.toString()) || 0),
                        0,
                      )
                      .toFixed(2)}
                  </div>
                  <div>
                    Total Goodwill Fee: $
                    {properties
                      .filter((p) =>
                        selectedPropertyIds.includes(p.property_id),
                      )
                      .reduce(
                        (sum, p) =>
                          sum + (parseFloat(p.goodwill_fee.toString()) || 0),
                        0,
                      )
                      .toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                <label className="font-medium">Due Day (1–31)</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={form.dueDate}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (val < 1) val = 1;
                    if (val > 31) val = 31;
                    setForm({ ...form, dueDate: val.toString() });
                  }}
                />
              </div>

              <div className="flex flex-col">
                <label>Interest</label>
                <Input
                  type="number"
                  placeholder="Interest"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={form.interest}
                  onChange={(e) => setForm({ ...form, interest: e.target.value })}
                />
              </div>

              <div className="flex flex-col">
                <label>Surcharge</label>
                <Input
                  type="number"
                  placeholder="Surcharge"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={form.surcharge}
                  onChange={(e) => setForm({ ...form, surcharge: e.target.value })}
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleCreateTenant}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Create Tenant
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className=" overflow-y-scroll">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Tenant Detail
            </SheetTitle>
            <SheetDescription className="text-white">
              Review tenant details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <label className="text-xs text-gray-500">
              Tenant ID: {selectedTenant?.tenant_id}
            </label>

            <div className="flex flex-col">
              <label>Name</label>
              <Input
                value={selectedTenant?.name ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Email</label>
              <Input
                value={selectedTenant?.email ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Phone</label>
              <Input
                value={selectedTenant?.phone ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Address</label>
              <Input
                value={selectedTenant?.address ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Properties</label>
              <div className="border rounded-md p-3">
                {selectedTenant?.rentedProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No properties assigned
                  </p>
                ) : (
                  selectedTenant?.rentedProperties.map((rp) => (
                    <div key={rp.property.property_id} className="py-2">
                      <p className="text-sm">
                        {rp.property.property_name} - {rp.property.building_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rent: ${Number(rp.property.rent_fee).toFixed(2)}, Goodwill: ${Number(rp.property.goodwill_fee).toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label>Status</label>
              <Input
                value={selectedTenant?.status ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Total Monthly Rent</label>
              <Input
                value={
                  selectedTenant?.total_monthly_rent
                    ? `$${Number(selectedTenant.total_monthly_rent).toFixed(2)}`
                    : "-"
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>Total Goodwill Fee</label>
              <Input
                value={
                  selectedTenant?.total_goodwill_fee
                    ? `$${Number(selectedTenant.total_goodwill_fee).toFixed(2)}`
                    : "-"
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>
            
            <div className="flex flex-col">
              <label>Due Day</label>
              <Input
                value={selectedTenant?.dueDate ? selectedTenant.dueDate : "-"}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={() => {
                setOpen(false);
                if (selectedTenant) {
                  const currentPropertyIds = selectedTenant.rentedProperties.map(rp => rp.property.property_id);
                  setEditForm({
                    name: selectedTenant.name,
                    email: selectedTenant.email,
                    phone: selectedTenant.phone,
                    address: selectedTenant.address,
                    status: selectedTenant.status,
                    business_name: selectedTenant.rentedProperties[0]?.business_name || "",
                    business_type: selectedTenant.rentedProperties[0]?.business_type || "",
                    dueDate: selectedTenant.dueDate ? selectedTenant.dueDate.toString() : "",
                    interest: selectedTenant.interest ? selectedTenant.interest.toString() : "",
                    surcharge: selectedTenant.surcharge ? selectedTenant.surcharge.toString() : "",
                  });
                  setEditSelectedPropertyIds(currentPropertyIds);
                }
                setOpenEditForm(true);
              }}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Edit Tenant
            </Button>

            <SheetClose asChild>
              <Button
                variant="destructive"
                onClick={() => setOpenDialog(true)}
                className="w-full rounded-sm py-5 font-medium"
              >
                Delete Tenant
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={openEditForm} onOpenChange={setOpenEditForm}>
        <SheetContent side="right" className=" overflow-y-scroll">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Edit Tenant Detail
            </SheetTitle>
            <SheetDescription className="text-white">
              Update tenant details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <label className="text-xs text-gray-500">
              Tenant ID: {selectedTenant?.tenant_id}
            </label>

            <div className="flex flex-col">
              <label>Name</label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>Email</label>
              <Input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>Phone</label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>Address</label>
              <Input
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>Business Name</label>
              <Input
                placeholder="Business Name"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={editForm.business_name}
                onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>Business Type</label>
              <Input
                placeholder="Business Type"
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={editForm.business_type}
                onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium">Select Properties</label>
              <div className="border rounded-md p-3 max-h-30 overflow-y-scroll">
                {(() => {
                  const currentPropertyIds = selectedTenant?.rentedProperties.map(rp => rp.property.property_id) || [];
                  const availableProperties = properties.filter(p => p.status === "AVAILABLE" || currentPropertyIds.includes(p.property_id));
                  if (availableProperties.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No properties available
                      </p>
                    );
                  }
                  return availableProperties.map((property) => {
                    const isChecked = editSelectedPropertyIds.includes(property.property_id);
                    return (
                      <div
                        key={property.property_id}
                        className="flex items-center gap-2 py-2"
                      >
                        <Checkbox
                          id={`edit-property-${property.property_id}`}
                          checked={isChecked}
                          onCheckedChange={() => {
                            setEditSelectedPropertyIds((prev) =>
                              prev.includes(property.property_id)
                                ? prev.filter((id) => id !== property.property_id)
                                : [...prev, property.property_id]
                            );
                          }}
                        />
                        <label
                          htmlFor={`edit-property-${property.property_id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {property.property_name} - {property.building_name}
                          <span className="text-muted-foreground text-xs ml-2">
                            (Rent: ${Number(property.rent_fee).toFixed(2)},
                            Goodwill: ${Number(property.goodwill_fee).toFixed(2)})
                          </span>
                        </label>
                      </div>
                    );
                  });
                })()}
              </div>
              {editSelectedPropertyIds.length > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded">
                  <div>
                    Total Monthly Rent: $
                    {properties
                      .filter((p) => editSelectedPropertyIds.includes(p.property_id))
                      .reduce(
                        (sum, p) => sum + (parseFloat(p.rent_fee.toString()) || 0),
                        0
                      )
                      .toFixed(2)}
                  </div>
                  <div>
                    Total Goodwill Fee: $
                    {properties
                      .filter((p) => editSelectedPropertyIds.includes(p.property_id))
                      .reduce(
                        (sum, p) => sum + (parseFloat(p.goodwill_fee.toString()) || 0),
                        0
                      )
                      .toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                <label className="font-medium">Due Day (1–31)</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={editForm.dueDate}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (val < 1) val = 1;
                    if (val > 31) val = 31;
                    setEditForm({ ...editForm, dueDate: val.toString() });
                  }}
                />
              </div>

              <div className="flex flex-col">
                <label>Interest</label>
                <Input
                  type="number"
                  placeholder="Interest"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={editForm.interest}
                  onChange={(e) => setEditForm({ ...editForm, interest: e.target.value })}
                />
              </div>

              <div className="flex flex-col">
                <label>Surcharge</label>
                <Input
                  type="number"
                  placeholder="Surcharge"
                  className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={editForm.surcharge}
                  onChange={(e) => setEditForm({ ...editForm, surcharge: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label>Status</label>
              <Select
                value={editForm.status}
                onValueChange={(value: "PAID" | "DELINQUENT" | "PARTIAL") =>
                  setEditForm({ ...editForm, status: value })
                }
              >
                <SelectTrigger className="w-full rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="">
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="DELINQUENT">Delinquent</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleUpdateTenant}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Update Tenant
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

      <Sheet open={openRecordLease} onOpenChange={setOpenRecordLease}>
        <SheetContent side="right" className=" overflow-y-scroll">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              Record New Lease
            </SheetTitle>
            <SheetDescription className="text-white">
              Select a property and set effective date.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-col">
              <label className="font-medium">Select Property</label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-scroll">
                {properties.filter(p => p.status === "AVAILABLE").length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No properties available
                  </p>
                ) : (
                  properties
                    .filter(p => p.status === "AVAILABLE")
                    .map((property) => (
                      <div
                        key={property.property_id}
                        className="flex items-center gap-2 py-2"
                      >
                        <Checkbox
                          id={`lease-property-${property.property_id}`}
                          checked={newLeasePropertyId === property.property_id}
                          onCheckedChange={(checked) => {
                            setNewLeasePropertyId(checked ? property.property_id : "");
                          }}
                        />
                        <label
                          htmlFor={`lease-property-${property.property_id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {property.property_name} - {property.building_name}
                          <span className="text-muted-foreground text-xs ml-2">
                            (Rent: ${Number(property.rent_fee).toFixed(2)},
                            Goodwill: ${Number(property.goodwill_fee).toFixed(2)})
                          </span>
                        </label>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="font-medium">Effective Start Date</label>
              <Input
                type="date"
                value={newLeaseEffectiveDate}
                onChange={(e) => setNewLeaseEffectiveDate(e.target.value)}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleRecordNewLease}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              Record Lease
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

      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">
              Delete this item?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete this
              record and remove it from your system.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
