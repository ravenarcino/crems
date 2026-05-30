import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();

    // Validate that selected properties are available
    if (body.propertyIds && Array.isArray(body.propertyIds) && body.propertyIds.length > 0) {
      const properties = await prisma.property.findMany({
        where: {
          property_id: { in: body.propertyIds },
          deletedAt: null,
        },
      });

      // Check if any property is already OCCUPIED
      const occupiedProperties = properties.filter(p => p.status === "OCCUPIED");
      if (occupiedProperties.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected properties are already occupied",
          },
          { status: 400 },
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        tenant_id: `TNT-${nanoid(10)}`,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        status: body.status || "PAID",
        total_monthly_rent: body.total_monthly_rent
          ? new Prisma.Decimal(body.total_monthly_rent)
          : null,
        total_goodwill_fee: body.total_goodwill_fee
          ? new Prisma.Decimal(body.total_goodwill_fee)
          : null,
        surcharge: body.surcharge ? new Prisma.Decimal(body.surcharge) : null,
        interest: body.interest ? new Prisma.Decimal(body.interest) : null,
        dueDate: body.dueDate ? parseInt(body.dueDate) : null,
      },
    });

    // Create rented property records if property IDs are provided
    if (body.propertyIds && Array.isArray(body.propertyIds) && body.propertyIds.length > 0) {
      const properties = await prisma.property.findMany({
        where: {
          property_id: { in: body.propertyIds },
          deletedAt: null,
        },
      });

      for (const property of properties) {
        await prisma.rented_Property.create({
          data: {
            tenantId: tenant.tenant_id,
            propertyId: property.property_id,
            building_name: property.building_name,
            business_name: body.business_name || "",
            business_type: body.business_type || "",
            rent_fee: property.rent_fee,
            goodwill_fee: property.goodwill_fee,
            effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
          },
        });

        // Mark property as OCCUPIED
        await prisma.property.update({
          where: { property_id: property.property_id },
          data: { status: "OCCUPIED" },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: tenant,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create tenant: ${error}`,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);

  const where = {
    deletedAt: null,
  };

  const tenants = await prisma.tenant.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      rentedProperties: {
        where: { deletedAt: null },
        include: {
          property: true,
        },
      },
    },
  });

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const tenantsWithDynamicTotals = tenants.map(tenant => {
    let totalMonthlyRent = new Prisma.Decimal(0);
    let totalGoodwillFee = new Prisma.Decimal(0);

    for (const rp of tenant.rentedProperties) {
      const effectiveDate = new Date(rp.effectiveDate || rp.createdAt);
      const effectiveYear = effectiveDate.getFullYear();
      const effectiveMonth = effectiveDate.getMonth();

      if (currentYear > effectiveYear || (currentYear === effectiveYear && currentMonth >= effectiveMonth)) {
        totalMonthlyRent = totalMonthlyRent.add(rp.rent_fee);
        totalGoodwillFee = totalGoodwillFee.add(rp.goodwill_fee);
      }
    }

    return {
      ...tenant,
      total_monthly_rent: totalMonthlyRent,
      total_goodwill_fee: totalGoodwillFee,
    };
  });

  const total = await prisma.tenant.count({
    where,
  });

  return Response.json({
    data: tenantsWithDynamicTotals,
    total,
  });
}
