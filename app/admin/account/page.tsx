"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  IdCard,
  User,
  Mail,
  Shield,
  CalendarPlus,
  CalendarCheck2,
  Lock,
  Trash,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"

type UserRole = "ADMIN" | "USER"

interface AccountUser {
  id: number
  user_id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  USER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function InfoField({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  )
}

export default function AccountPage() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users-all"],
    queryFn: async () => {
      const res = await fetch("/api/user/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })

  const users: AccountUser[] = usersData?.data || []
  const user = users[0]

  const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" })
  const [editForm, setEditForm] = useState({ name: "", email: "" })

  const handleOpenEditSheet = () => {
    if (user) {
      setEditForm({ name: user.name, email: user.email })
      setIsEditSheetOpen(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!user) return

    const loadingToast = toast.loading(t("toast.updating"))

    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()

      await new Promise((r) => setTimeout(r, 1500))

      toast.dismiss(loadingToast)

      if (!res.ok) {
        toast.error(data.error || t("toast.error"))
        return
      }

      toast.success(t("toast.success"))
      setIsEditSheetOpen(false)
      queryClient.invalidateQueries({ queryKey: ["users-all"] })
    } catch (error) {
      await new Promise((r) => setTimeout(r, 1500))
      toast.dismiss(loadingToast)
      toast.error(t("toast.error"))
      console.log("error", error)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return

    const loadingToast = toast.loading(t("toast.saving"))

    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.newPassword }),
      })

      const data = await res.json()

      await new Promise((r) => setTimeout(r, 1500))

      toast.dismiss(loadingToast)

      if (!res.ok) {
        toast.error(data.error || t("toast.error"))
        return
      }

      toast.success(t("toast.success"))
      setIsPasswordSheetOpen(false)
      setPasswordForm({ currentPassword: "", newPassword: "" })
    } catch (error) {
      await new Promise((r) => setTimeout(r, 1500))
      toast.dismiss(loadingToast)
      toast.error(t("toast.error"))
      console.log("error", error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    const loadingToast = toast.loading(t("toast.deleting"))

    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      await new Promise((r) => setTimeout(r, 1500))

      toast.dismiss(loadingToast)

      if (!res.ok) {
        toast.error(data.error || t("toast.error"))
        return
      }

      toast.success(t("toast.success"))
    } catch (error) {
      await new Promise((r) => setTimeout(r, 1500))
      toast.dismiss(loadingToast)
      toast.error(t("toast.error"))
      console.log("error", error)
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 flex items-center justify-center h-[50vh]">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Spinner />
          {t("toast.loading")}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No user found</p>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-lg flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div>
            <h1 className="text-lg font-medium">{user.name}</h1>
            <Badge className={`mt-1 text-xs ${ROLE_STYLES[user.role]}`} variant="outline">
              {user.role}
            </Badge>
          </div>
        </div>

        {/* Personal Information */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("account.personalInfo")}
            </p>
            <Button variant="outline" size="sm" onClick={handleOpenEditSheet}>
              {t("account.edit")}
            </Button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y">
            <InfoField icon={IdCard} label={t("account.userId")} value={user.user_id} mono />
            <InfoField icon={User} label={t("account.fullName")} value={user.name} />
            <InfoField icon={Mail} label={t("account.email")} value={user.email} />
            <InfoField icon={Shield} label={t("account.role")} value={user.role} />
            <InfoField icon={CalendarPlus} label={t("account.memberSince")} value={formatDate(user.createdAt)} />
            <InfoField icon={CalendarCheck2} label={t("account.lastUpdated")} value={formatDate(user.updatedAt)} />
          </div>
        </div>

        {/* Security */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("account.security")}
            </p>
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("account.password")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("account.passwordDescription")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsPasswordSheetOpen(true)}>
              {t("account.changePassword")}
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">{t("account.deleteAccount")}</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              {t("account.deleteDescription")}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash className="w-4 h-4 mr-1.5" />
            {t("account.delete")}
          </Button>
        </div>
      </div>

      {/* Edit Details Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className=" overflow-y-auto">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">{t("account.editTitle")}</SheetTitle>
            <SheetDescription className="text-white">
              {t("account.editDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{t("account.fullName")}</Label>
              <Input
                id="editName"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">{t("account.email")}</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <SheetFooter className="p-4">
            <Button
              onClick={handleSaveEdit}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              {t("account.saveChanges")}
            </Button>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                {t("account.close")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Change Password Sheet */}
      <Sheet open={isPasswordSheetOpen} onOpenChange={setIsPasswordSheetOpen}>
        <SheetContent side="right" className=" overflow-y-auto">
          <SheetHeader className="bg-green-800">
            <SheetTitle className="text-white font-bold">{t("account.changePasswordTitle")}</SheetTitle>
            <SheetDescription className="text-white">
              {t("account.changePasswordDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("account.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <SheetFooter className="p-4">
            <Button
              onClick={handleChangePassword}
              className="w-full bg-green-800 rounded-sm py-5 text-white font-medium"
            >
              {t("account.save")}
            </Button>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-sm py-5 font-medium"
              >
                {t("account.close")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("account.deleteAccountDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">{t("general.cancel")}</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash className="w-4 h-4 mr-1.5" />
                {t("account.delete")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
