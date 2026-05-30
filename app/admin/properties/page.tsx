"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ellipsis } from "lucide-react";
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
import { Separator } from "radix-ui";
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

export default function PropertiesPage() {
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
    property_name: "",
    building_name: "",
    area: "",
    rent_fee: "",
    goodwill_fee: "",
  });
  const [editForm, setEditForm] = useState({
    property_name: "",
    building_name: "",
    area: "",
    rent_fee: "",
    goodwill_fee: "",
    status: "",
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );

  //filters
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("all");
  const [status, setStatus] = useState("all");

  // const [properties, setProperties] = useState<Property[]>([]);

  const handleCreateProperty = async () => {
    // Validation
    if (!form.property_name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.building_name.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.area.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.rent_fee.trim()) {
      toast.error(t("toast.error"));
      return;
    }
    if (!form.goodwill_fee.trim()) {
      toast.error(t("toast.error"));
      return;
    }

    const loadingToast = toast.loading(t("toast.creating"));

    try {
      const res = await fetch("/api/property/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        property_name: "",
        building_name: "",
        area: "",
        rent_fee: "",
        goodwill_fee: "",
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

  const { data, isLoading } = useQuery({
    queryKey: ["properties", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/property/properties?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error);

      return json;
    },
  });

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;

    const loadingToast = toast.loading(t("toast.deleting"));

    setDeleting(true);

    try {
      const res = await fetch(`/api/property/${selectedProperty.property_id}`, {
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
      setSelectedProperty(null);
      setDeleting(false);

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

  const handleUpdateProperty = async () => {
    if (!selectedProperty) return;

    const loadingToast = toast.loading(t("toast.updating"));

    try {
      const res = await fetch(`/api/property/${selectedProperty.property_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
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
      setSelectedProperty(null);

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

  const properties: Property[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const uniqueBuildings = Array.from(
    new Map(properties.map((p) => [p.building_name, p])).values(),
  );

  const filteredProperties = properties.filter((p) => {
    const matchSearch =
      p.property_name.toLowerCase().includes(search.toLowerCase()) ||
      p.building_name.toLowerCase().includes(search.toLowerCase());

    const matchBuilding = building === "all" || p.building_name === building;

    const matchStatus =
      status === "all" || p.status.toLowerCase() === status.toLowerCase();

    return matchSearch && matchBuilding && matchStatus;
  });

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{t("properties.title")}</p>
          <p className="text-sm text-muted-foreground text-wrap">
            {t("properties.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setOpenForm(true)}
          className="w-full lg:w-fit bg-green-800 text-white px-4 py-4 rounded-sm font-medium "
        >
          + {t("button.addProperty")}
        </Button>
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

        <Select value={building} onValueChange={setBuilding}>
          <SelectTrigger className="w-full lg:max-w-48 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue placeholder="Select a building" />
          </SelectTrigger>

          <SelectContent
            position="popper"
            sideOffset={4}
            className="w-fit "
          >
            <SelectGroup>
              <SelectLabel>Buildings</SelectLabel>
              <SelectItem value="all">All</SelectItem>
              {uniqueBuildings.map((property) => (
                <SelectItem
                  key={property.property_id}
                  value={property.building_name}
                >
                  {property.building_name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

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
              <SelectItem value="available">{t("reports.available")}</SelectItem>
              <SelectItem value="occupied">{t("reports.occupied")}</SelectItem>
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
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Spinner />
                      {t("table.loading")}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : properties.length === 0 ? (
              <>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No properties found
                    </TableCell>
                  </TableRow>
                </TableBody>
              </>
            ) : (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>{t("properties.propertyName")}</TableHead>
                    <TableHead>{t("properties.building")}</TableHead>
                    <TableHead>{t("properties.areaSize")}</TableHead>
                    <TableHead>{t("properties.monthlyRent")}</TableHead>
                    <TableHead>{t("properties.goodwillFee")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.action")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProperties.map((property, index) => (
                    <TableRow key={property.property_id}>
                      <TableCell className="font-medium">
                        {index + 1 + (page - 1) * limit}
                      </TableCell>

                      <TableCell className="font-medium">
                        {property.property_name}
                      </TableCell>

                      <TableCell>{property.building_name}</TableCell>

                      <TableCell>{property.area}</TableCell>

                      <TableCell>{property.rent_fee}</TableCell>

                      <TableCell>{property.goodwill_fee}</TableCell>

                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            property.status.toLowerCase() === "occupied"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {property.status.toLowerCase()}
                        </span>
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
                                  setSelectedProperty(property);
                                  setOpen(true);
                                }}
                              >
                                {t("properties.view")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setEditForm({
                                    property_name: property.property_name,
                                    building_name: property.building_name,
                                    area: property.area?.toString() || "",
                                    rent_fee:
                                      property.rent_fee?.toString() || "",
                                    goodwill_fee:
                                      property.goodwill_fee?.toString() || "",
                                    status: property.status || "",
                                  });
                                  setOpenEditForm(true);
                                }}
                              >
                                {t("properties.edit")}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setOpenDialog(true);
                                }}
                              >
                                {t("properties.delete")}
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
        <SheetContent side="right" className=" overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              {t("properties.addNew")}
            </SheetTitle>
            <SheetDescription className="text-white">
              Fill in property details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-col">
              <label>{t("properties.propertyName")}</label>
              <Input
                placeholder={t("properties.propertyName")}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.property_name}
                onChange={(e) =>
                  setForm({ ...form, property_name: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.building")}</label>
              <Input
                placeholder={t("properties.building")}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.building_name}
                onChange={(e) =>
                  setForm({ ...form, building_name: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.areaSize")}</label>
              <Input
                placeholder={t("properties.areaSize")}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.monthlyRent")}</label>
              <Input
                placeholder={t("properties.monthlyRent")}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.rent_fee}
                onChange={(e) => setForm({ ...form, rent_fee: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.goodwillFee")}</label>
              <Input
                placeholder={t("properties.goodwillFee")}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={form.goodwill_fee}
                onChange={(e) =>
                  setForm({ ...form, goodwill_fee: e.target.value })
                }
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleCreateProperty}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              {t("button.createProperty")}
            </Button>

            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                {t("button.cancel")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className=" overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              {t("properties.detail")}
            </SheetTitle>
            <SheetDescription className="text-white">
              Review property details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <label className="text-xs text-gray-500">
              Property ID: 432432FASDFA
            </label>

            <div className="flex flex-col">
              <label>{t("properties.propertyName")}</label>
              <Input
                value={selectedProperty?.property_name ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.building")}</label>
              <Input
                value={selectedProperty?.building_name ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.areaSize")}</label>
              <Input
                value={selectedProperty?.area ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.monthlyRent")}</label>
              <Input
                value={selectedProperty?.rent_fee ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.goodwillFee")}</label>
              <Input
                value={selectedProperty?.goodwill_fee ?? ""}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>

            <div className="flex flex-col">
              <label>{t("table.status")}</label>
              <Input
                value={(selectedProperty?.status ?? "").toLowerCase()}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                readOnly
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={() => {
                setOpen(false);
                setEditForm({
                  property_name: selectedProperty?.property_name ?? "",
                  building_name: selectedProperty?.building_name ?? "",
                  area: selectedProperty?.area.toString() || "",
                  rent_fee: selectedProperty?.rent_fee.toString() || "",
                  goodwill_fee: selectedProperty?.goodwill_fee.toString() || "",
                  status: selectedProperty?.status || "",
                });
                setOpenEditForm(true);
              }}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              {t("button.editProperty")}
            </Button>

            <SheetClose asChild>
              <Button
                variant="destructive"
                onClick={() => setOpenDialog(true)}
                className="w-full rounded-sm py-5 font-medium"
              >
                {t("button.deleteProperty")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={openEditForm} onOpenChange={setOpenEditForm}>
        <SheetContent side="right" className=" overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">
              {t("properties.editDetail")}
            </SheetTitle>
            <SheetDescription className="text-white">
              Update property details below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 p-4">
            <label className="text-xs text-gray-500">
              Property ID: 432432FASDFA
            </label>
            {/* FORM GOES HERE */}
            <div className="flex flex-col">
              <label>{t("properties.propertyName")}</label>
              <Input
                value={editForm.property_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, property_name: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.building")}</label>
              <Input
                value={editForm.building_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, building_name: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.areaSize")}</label>
              <Input
                value={editForm.area}
                onChange={(e) =>
                  setEditForm({ ...editForm, area: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.monthlyRent")}</label>
              <Input
                value={editForm.rent_fee}
                onChange={(e) =>
                  setEditForm({ ...editForm, rent_fee: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>{t("properties.goodwillFee")}</label>
              <Input
                value={editForm.goodwill_fee}
                onChange={(e) =>
                  setEditForm({ ...editForm, goodwill_fee: e.target.value })
                }
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex flex-col">
              <label>{t("table.status")}</label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="w-full rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">{t("reports.available")}</SelectItem>
                  <SelectItem value="OCCUPIED">{t("reports.occupied")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleUpdateProperty}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              {t("button.updateProperty")}
            </Button>

            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                {t("button.cancel")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">
              {t("alert.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {t("alert.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProperty}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t("toast.deleting") : t("button.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
