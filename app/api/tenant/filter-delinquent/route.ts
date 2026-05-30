import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long" });
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Get all tenants with due date
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
    });

    for (const tenant of tenants) {
      // Get all current month payments (including partial)
      const currentMonthPayments = await prisma.payments.findMany({
        where: {
          tenantId: tenant.tenant_id,
          month: currentMonth,
          year: currentYear,
          deletedAt: null,
        },
      });

      // Calculate total paid for current month
      const totalPaidForMonth = currentMonthPayments.reduce(
        (sum, p) => sum.add(p.amount),
        new Prisma.Decimal(0)
      );

      // Get expected monthly rent
      let expectedRent: Prisma.Decimal | null = null;
      const firstPaymentWithRent = currentMonthPayments.find(p => p.expectedMonthlyRent !== null);
      if (firstPaymentWithRent && firstPaymentWithRent.expectedMonthlyRent) {
        expectedRent = firstPaymentWithRent.expectedMonthlyRent;
      } else if (tenant.total_monthly_rent) {
        expectedRent = tenant.total_monthly_rent;
      }

      // Check if fully paid
      let isFullyPaid = false;
      if (expectedRent) {
        isFullyPaid = totalPaidForMonth.gte(expectedRent);
      }

      // Check if due date has passed
      let dueDayPassed = false;
      if (tenant.dueDate) {
        dueDayPassed = tenant.dueDate < currentDay;
      }

      let newStatus: "PAID" | "PARTIAL" | "DELINQUENT" = tenant.status as any;
      
      if (isFullyPaid) {
        newStatus = "PAID";
      } else if (totalPaidForMonth.gt(0) && expectedRent && totalPaidForMonth.lt(expectedRent)) {
        newStatus = "PARTIAL";
      } else if (dueDayPassed && !isFullyPaid) {
        newStatus = "DELINQUENT";
      }

      if (newStatus !== tenant.status) {
        await prisma.tenant.update({
          where: { tenant_id: tenant.tenant_id },
          data: { status: newStatus },
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("FILTER DELINQUENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to filter delinquent tenants" },
      { status: 500 },
    );
  }
}
