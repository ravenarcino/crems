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

    const property = await prisma.property.create({
      data: {
        property_id: `PRP-${nanoid(10)}`, // simple auto ID for now
        property_name: body.property_name,
        building_name: body.building_name,
        area: parseFloat(body.area),
        rent_fee: new Prisma.Decimal(body.rent_fee),
        goodwill_fee: new Prisma.Decimal(body.goodwill_fee),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: property,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create property: ${error}`,
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

  const properties = await prisma.property.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.property.count({
    where,
  });

  return Response.json({
    data: properties,
    total,
  });
}
