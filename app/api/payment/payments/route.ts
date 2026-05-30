import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const tenantId = searchParams.get("tenantId");

  const where: any = {};

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const payments = await prisma.payments.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tenant: true,
    },
  });

  const total = await prisma.payments.count({
    where,
  });

  return Response.json({
    data: payments,
    total,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();

    if (!body.tenantId || !body.month || !body.year) {
      return NextResponse.json(
        { success: false, error: "Tenant ID, month, and year are required" },
        { status: 400 },
      );
    }

    if (!body.amount || isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a valid positive number" },
        { status: 400 },
      );
    }

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString("en-US", { month: "long" });
    const currentYear = currentDate.getFullYear();
    const isCurrentMonth = body.month === currentMonth && Number(body.year) === currentYear;

    const payment = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { tenant_id: body.tenantId },
      });

      if (!tenant) {
        throw new Error("Tenant not found");
      }

      const newPayment = await tx.payments.create({
        data: {
          ticketId: `PAY-${nanoid(10)}`,
          tenantId: body.tenantId,
          month: body.month,
          year: Number(body.year),
          amount: new Prisma.Decimal(body.amount),
          status: body.status || "PARTIAL",
          paidDate: body.paidDate ? new Date(body.paidDate) : null,
          expectedMonthlyRent: tenant.total_monthly_rent,
          surchargePercent: body.surchargePercent !== undefined ? new Prisma.Decimal(body.surchargePercent) : null,
          interestPercent: body.interestPercent !== undefined ? new Prisma.Decimal(body.interestPercent) : null,
          surchargeAmount: body.surchargeAmount !== undefined ? new Prisma.Decimal(body.surchargeAmount) : null,
          interestAmount: body.interestAmount !== undefined ? new Prisma.Decimal(body.interestAmount) : null,
        },
      });

      if (isCurrentMonth) {
        if (tenant && tenant.total_monthly_rent) {
          const currentMonthPayments = await tx.payments.findMany({
            where: {
              tenantId: body.tenantId,
              month: currentMonth,
              year: currentYear,
              deletedAt: null,
            },
          });
          
          const totalPaidForMonth = currentMonthPayments.reduce(
            (sum, p) => sum.add(p.amount),
            new Prisma.Decimal(0)
          );

          let expectedRent: Prisma.Decimal;
          const firstPaymentWithRent = currentMonthPayments.find(p => p.expectedMonthlyRent !== null);
          if (firstPaymentWithRent && firstPaymentWithRent.expectedMonthlyRent) {
            expectedRent = firstPaymentWithRent.expectedMonthlyRent;
          } else {
            expectedRent = tenant.total_monthly_rent;
          }

          let newStatus: "PAID" | "PARTIAL" | "DELINQUENT" = tenant.status as any;
          if (totalPaidForMonth.gte(expectedRent)) {
            newStatus = "PAID";
          } else if (totalPaidForMonth.gt(0) && totalPaidForMonth.lt(expectedRent)) {
            newStatus = "PARTIAL";
          }

          if (newStatus !== tenant.status) {
            await tx.tenant.update({
              where: { tenant_id: body.tenantId },
              data: { status: newStatus },
            });
          }
        }
      }

      return newPayment;
    });

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create payment: ${error}`,
      },
      { status: 500 },
    );
  }
}
