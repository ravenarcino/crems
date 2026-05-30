import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

//Hard Delete
// export async function DELETE(
//   req: Request,
//   { params }: { params: Promise<{ id: string }> },
// ) {
//   const session = await auth();
//   if (!session || session.user?.role !== "ADMIN") {
//     return Response.json({ error: "Unauthorized" }, { status: 403 });
//   }
//   const { id } = await params;

//   try {
//     await prisma.property.delete({
//       where: { property_id: id },
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("DELETE ERROR:", error);

//     return NextResponse.json(
//       { success: false, message: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }

//Sodt Delete
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  try {
    const updated = await prisma.property.update({
      where: { property_id: id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("SOFT DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete property" },
      { status: 500 },
    );
  }
}

//Update Property
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  try {
    const body = await req.json();

    const updated = await prisma.property.update({
      where: { property_id: id },
      data: {
        property_name: body.property_name,
        building_name: body.building_name,
        area: parseFloat(body.area),
        rent_fee: new Prisma.Decimal(body.rent_fee),
        goodwill_fee: new Prisma.Decimal(body.goodwill_fee),
        status: body.status,
      },
    });

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 },
    );
  }
}
