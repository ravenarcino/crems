import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const payment = await prisma.payments.findUnique({
    where: { ticketId: id },
    include: {
      tenant: true,
    },
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: "Payment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: payment });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.amount !== undefined) {
      if (isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
        return NextResponse.json(
          { success: false, error: "Amount must be a valid positive number" },
          { status: 400 },
        );
      }
    }

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString("en-US", { month: "long" });
    const currentYear = currentDate.getFullYear();

    const payment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payments.update({
        where: { ticketId: id },
        data: {
          month: body.month,
          year: body.year ? Number(body.year) : undefined,
          amount: body.amount !== undefined ? new Prisma.Decimal(body.amount) : undefined,
          status: body.status,
          paidDate: body.paidDate ? new Date(body.paidDate) : null,
          surchargePercent: body.surchargePercent !== undefined ? (body.surchargePercent ? new Prisma.Decimal(body.surchargePercent) : null) : undefined,
          interestPercent: body.interestPercent !== undefined ? (body.interestPercent ? new Prisma.Decimal(body.interestPercent) : null) : undefined,
        },
      });

      const isCurrentMonth = updatedPayment.month === currentMonth && updatedPayment.year === currentYear;

      if (isCurrentMonth) {
        const tenant = await tx.tenant.findUnique({
          where: { tenant_id: updatedPayment.tenantId },
        });

        if (tenant && tenant.total_monthly_rent) {
          const currentMonthPayments = await tx.payments.findMany({
            where: {
              tenantId: updatedPayment.tenantId,
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
              where: { tenant_id: updatedPayment.tenantId },
              data: { status: newStatus },
            });
          }
        }
      }

      return updatedPayment;
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
        error: `Failed to update payment: ${error}`,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const paymentToDelete = await tx.payments.findUnique({
        where: { ticketId: id },
      });

      if (!paymentToDelete) {
        throw new Error("Payment not found");
      }

      const deletedPayment = await tx.payments.update({
        where: { ticketId: id },
        data: {
          deletedAt: new Date(),
        },
      });

      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString("en-US", { month: "long" });
      const currentYear = currentDate.getFullYear();
      const isCurrentMonth = deletedPayment.month === currentMonth && deletedPayment.year === currentYear;

      if (isCurrentMonth) {
        const tenant = await tx.tenant.findUnique({
          where: { tenant_id: deletedPayment.tenantId },
        });

        if (tenant && tenant.total_monthly_rent) {
          const currentMonthPayments = await tx.payments.findMany({
            where: {
              tenantId: deletedPayment.tenantId,
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
          } else if (totalPaidForMonth.equals(0)) {
            newStatus = "DELINQUENT";
          }

          if (newStatus !== tenant.status) {
            await tx.tenant.update({
              where: { tenant_id: deletedPayment.tenantId },
              data: { status: newStatus },
            });
          }
        }
      }

      return deletedPayment;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Payment deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete payment: ${error}`,
      },
      { status: 500 },
    );
  }
}
