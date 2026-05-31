import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const family = await prisma.family.findUnique({
      where: { editToken: token },
      include: {
        responses: true,
        rsvp: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const meals = await prisma.meal.findMany({
      orderBy: [{ day: "asc" }, { mealType: "asc" }],
    });

    return NextResponse.json({
      family: {
        id: family.id,
        itsId: family.itsId,
        headName: family.headName,
        lastName: family.lastName,
        phone: family.phone,
        email: family.email,
        memberCount: family.memberCount,
        editToken: family.editToken,
        createdAt: family.createdAt,
      },
      meals,
      responses: family.responses.map((r) => ({
        id: r.id,
        familyId: r.familyId,
        mealId: r.mealId,
        attending: r.attending,
      })),
      rsvp: family.rsvp,
    });
  } catch (error) {
    console.error("GET rsvp error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { mealId, attending } = body;

    if (!mealId || attending === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { editToken: token },
    });

    if (!family) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const updated = await prisma.mealResponse.upsert({
      where: { familyId_mealId: { familyId: family.id, mealId } },
      update: { attending },
      create: { familyId: family.id, mealId, attending },
    });

    // Touch RSVP updatedAt (upsert so it works even if not yet submitted)
    await prisma.rsvp.upsert({
      where: { familyId: family.id },
      update: { updatedAt: new Date() },
      create: { familyId: family.id },
    });

    return NextResponse.json({ response: updated });
  } catch (error) {
    console.error("PATCH rsvp error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
