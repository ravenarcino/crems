import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
    // Find all rented properties for this tenant
    const rentedProperties = await prisma.rented_Property.findMany({
      where: {
        tenantId: id,
        deletedAt: null,
      },
    });

    // Mark all associated properties as AVAILABLE
    for (const rentedProperty of rentedProperties) {
      await prisma.property.update({
        where: { property_id: rentedProperty.propertyId },
        data: { status: "AVAILABLE" },
      });
    }

    // Soft delete the tenant
    const updated = await prisma.tenant.update({
      where: { tenant_id: id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("SOFT DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete tenant" },
      { status: 500 },
    );
  }
}

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

    // Handle property updates
    if (body.propertyIds && Array.isArray(body.propertyIds)) {
      // Get current rented properties for this tenant
      const currentRentedProperties = await prisma.rented_Property.findMany({
        where: {
          tenantId: id,
          deletedAt: null,
        },
      });

      const currentPropertyIds = currentRentedProperties.map(rp => rp.propertyId);
      const newPropertyIds = body.propertyIds;

      // Update business name and type for existing (remaining) rented properties
      const propertiesToKeep = currentPropertyIds.filter(
        (pid: string) => newPropertyIds.includes(pid)
      );
      
      if (propertiesToKeep.length > 0) {
        await prisma.rented_Property.updateMany({
          where: {
            tenantId: id,
            propertyId: { in: propertiesToKeep },
          },
          data: {
            business_name: body.business_name || "",
            business_type: body.business_type || "",
          },
        });
      }

      // Validate that new properties (not in current) are available
      const newPropertiesToCheck = newPropertyIds.filter(
        (pid: string) => !currentPropertyIds.includes(pid)
      );
      
      if (newPropertiesToCheck.length > 0) {
        const properties = await prisma.property.findMany({
          where: {
            property_id: { in: newPropertiesToCheck },
            deletedAt: null,
          },
        });
        
        const occupiedProperties = properties.filter(p => p.status === "OCCUPIED");
        if (occupiedProperties.length > 0) {
          return NextResponse.json(
            { success: false, message: "Selected properties are already occupied" },
            { status: 400 }
          );
        }
      }

      // Step 1: Mark old properties as AVAILABLE
      const propertiesToRemove = currentPropertyIds.filter(
        (pid: string) => !newPropertyIds.includes(pid)
      );
      
      for (const propertyId of propertiesToRemove) {
        await prisma.property.update({
          where: { property_id: propertyId },
          data: { status: "AVAILABLE" },
        });
        
        // Soft delete the old rented property records
        await prisma.rented_Property.updateMany({
          where: {
            tenantId: id,
            propertyId: propertyId,
          },
          data: { deletedAt: new Date() },
        });
      }

      // Step 2: Add new properties
      const propertiesToAdd = newPropertyIds.filter(
        (pid: string) => !currentPropertyIds.includes(pid)
      );
      
      if (propertiesToAdd.length > 0) {
        const properties = await prisma.property.findMany({
          where: {
            property_id: { in: propertiesToAdd },
            deletedAt: null,
          },
        });

        for (const property of properties) {
          await prisma.rented_Property.create({
            data: {
              tenantId: id,
              propertyId: property.property_id,
              building_name: property.building_name,
              business_name: body.business_name || "",
              business_type: body.business_type || "",
              rent_fee: property.rent_fee,
              goodwill_fee: property.goodwill_fee,
              effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
            },
          });

          await prisma.property.update({
            where: { property_id: property.property_id },
            data: { status: "OCCUPIED" },
          });
        }
      }
    }

    // Update tenant basic info
    const updated = await prisma.tenant.update({
      where: { tenant_id: id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        status: body.status,
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
