import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itsId, headName, lastName, memberCount, email, phone } = body;

    if (!itsId || !headName || !lastName || !email) {
      return NextResponse.json(
        { error: "ITS ID, head of family name, last name, and email are required." },
        { status: 400 }
      );
    }

    const itsIdStr = String(itsId).trim();
    const headNameStr = String(headName).trim();
    const lastNameStr = String(lastName).trim();
    const count = typeof memberCount === "number" && memberCount > 0 ? memberCount : 1;

    const existing = await prisma.family.findUnique({
      where: { itsId: itsIdStr },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This ITS ID is already registered. Please sign in to view or edit your RSVP.", alreadyRegistered: true },
        { status: 409 }
      );
    }

    const meals = await prisma.meal.findMany();

    const family = await prisma.family.create({
      data: {
        itsId: itsIdStr,
        headName: headNameStr,
        lastName: lastNameStr,
        memberCount: count,
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
      },
    });

    // Pre-create MealResponse rows for instant RSVP form load
    for (const meal of meals) {
      await prisma.mealResponse.create({
        data: { familyId: family.id, mealId: meal.id, attending: 0 },
      });
    }

    return NextResponse.json({ editToken: family.editToken });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
