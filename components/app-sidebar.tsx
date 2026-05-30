"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { useLanguage } from "./language-provider";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  Home,
  Users,
  Building2,
  DollarSign,
  FileText,
  Building,
} from "lucide-react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useLanguage();
  
  const navMain = [
    {
      title: t("nav.dashboard"),
      url: "/admin/dashboard",
      icon: <Home className="size-4" />,
      isActive: true,
      items: [],
    },
    {
      title: t("nav.tenants"),
      url: "/admin/tenants",
      icon: <Users className="size-4" />,
      items: [],
    },
    {
      title: t("nav.properties"),
      url: "/admin/properties",
      icon: <Building2 className="size-4" />,
      items: [],
    },
    {
      title: t("nav.payments"),
      url: "/admin/payments",
      icon: <DollarSign className="size-4" />,
      items: [],
    },
    {
      title: t("nav.reports"),
      url: "/admin/reports",
      icon: <FileText className="size-4" />,
      items: [],
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-green-800 text-sidebar-primary-foreground">
                  <Building className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">CREMS</span>
                  <span className="truncate text-xs">
                    Rent Management System
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
