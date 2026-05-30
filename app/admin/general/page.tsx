"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"

type Theme = "light" | "dark"

export default function GeneralPage() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedLanguage = localStorage.getItem("preferredLanguage")
    if (savedLanguage) {
      setLanguage(savedLanguage as any)
    }
  }, [setLanguage])

  if (!mounted) {
    return null
  }

  const selectedTheme = (theme || "dark") as Theme

  const handleSaveChanges = () => {
    localStorage.setItem("preferredLanguage", language)
    toast.success(t("general.settingsSaved"))
  }

  const themes: { value: Theme; label: string }[] = [
    { value: "light",  label: t("general.default")  },
    { value: "dark",   label: t("general.dark")   },
  ]

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-lg font-medium">{t("general.title")}</h1>

      {/* Appearance */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("general.appearance")}
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium mb-1">{t("general.theme")}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {t("general.themeDescription")}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {themes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`rounded-lg overflow-hidden text-left border transition-all ${
                  selectedTheme === value
                    ? "border-2 border-blue-500"
                    : "border border-border"
                }`}
              >
                <div style={{ 
                  background: value === "dark" ? "#1a1a1a" : "#f8f8f8", 
                  padding: "12px 12px 8px" 
                }}>
                  <div style={{ 
                    background: value === "dark" ? "#242424" : "#fff", 
                    borderRadius: 4, 
                    border: `0.5px solid ${value === "dark" ? "#333" : "#e5e5e5"}`, 
                    padding: 8, 
                    marginBottom: 6 
                  }}>
                    <div style={{ 
                      width: "40%", 
                      height: 6, 
                      background: value === "dark" ? "#333" : "#e0e0e0", 
                      borderRadius: 3, 
                      marginBottom: 5 
                    }} />
                    <div style={{ 
                      width: "70%", 
                      height: 4, 
                      background: value === "dark" ? "#2e2e2e" : "#efefef", 
                      borderRadius: 3 
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <div style={{ 
                      flex: 1, 
                      height: 28, 
                      background: value === "dark" ? "#242424" : "#fff", 
                      borderRadius: 4, 
                      border: `0.5px solid ${value === "dark" ? "#333" : "#e5e5e5"}` 
                    }} />
                    <div style={{ 
                      flex: 2, 
                      height: 28, 
                      background: value === "dark" ? "#242424" : "#fff", 
                      borderRadius: 4, 
                      border: `0.5px solid ${value === "dark" ? "#333" : "#e5e5e5"}` 
                    }} />
                  </div>
                </div>
                <div className="px-2.5 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  {selectedTheme === value && (
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("general.preferences")}
          </p>
        </div>

        <div className="divide-y">
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("general.language")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("general.languageDescription")}
              </p>
            </div>
            <Select value={language} onValueChange={(val) => setLanguage(val as any)}>
              <SelectTrigger className="w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fil">Filipino</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">{t("general.cancel")}</Button>
        <Button size="sm" onClick={handleSaveChanges}>{t("general.save")}</Button>
      </div>
    </div>
  )
}