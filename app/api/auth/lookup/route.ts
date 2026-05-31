import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itsId, headName, lastName } = body;

    if (!itsId || !headName || !lastName) {
      return NextResponse.json(
        { error: "ITS ID, head of family name, and last name are required." },
        { status: 400 }
      );
    }

    const itsIdStr = String(itsId).trim();
    const headNameStr = String(headName).trim();
    const lastNameStr = String(lastName).trim();

    const existing = await prisma.family.findUnique({
      where: { itsId: itsIdStr },
      include: { members: true },
    });

    if (existing) {
      // Returning family — verify last name as light auth
      if (existing.lastName.toLowerCase() !== lastNameStr.toLowerCase()) {
        return NextResponse.json(
          { error: "Last name does not match our records." },
          { status: 401 }
        );
      }

      return NextResponse.json({ editToken: existing.editToken });
    }

    // New registration — create family with head of family as sole member
    const meals = await prisma.meal.findMany();

    const family = await prisma.family.create({
      data: {
        itsId: itsIdStr,
        headName: headNameStr,
        lastName: lastNameStr,
        members: {
          create: [{ name: `${headNameStr} ${lastNameStr}`, ageGroup: "adult" }],
        },
      },
      include: { members: true },
    });

    // Pre-create MealResponse rows for instant RSVP form load
    for (const member of family.members) {
      for (const meal of meals) {
        await prisma.mealResponse.create({
          data: { memberId: member.id, mealId: meal.id, attending: false },
        });
      }
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
