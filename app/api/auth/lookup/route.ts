import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itsId, lastName } = body;

    if (!itsId || !lastName) {
      return NextResponse.json(
        { error: "ITS ID and Last Name are required" },
        { status: 400 }
      );
    }

    const family = await prisma.family.findUnique({
      where: { itsId: String(itsId) },
      include: { members: true, rsvp: true },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Family not found. Please contact the event organizer." },
        { status: 404 }
      );
    }

    if (family.lastName.toLowerCase() !== lastName.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Last name does not match our records." },
        { status: 401 }
      );
    }

    // Create RSVP if not exists
    if (!family.rsvp) {
      await prisma.rsvp.create({
        data: { familyId: family.id },
      });
    }

    // Ensure MealResponse rows exist for all members × all meals
    const meals = await prisma.meal.findMany();
    for (const member of family.members) {
      for (const meal of meals) {
        await prisma.mealResponse.upsert({
          where: {
            memberId_mealId: { memberId: member.id, mealId: meal.id },
          },
          update: {},
          create: {
            memberId: member.id,
            mealId: meal.id,
            attending: false,
          },
        });
      }
    }

    return NextResponse.json({
      family: {
        id: family.id,
        itsId: family.itsId,
        headName: family.headName,
        lastName: family.lastName,
        phone: family.phone,
        email: family.email,
        editToken: family.editToken,
      },
      members: family.members,
      editToken: family.editToken,
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
