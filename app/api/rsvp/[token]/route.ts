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
        members: {
          include: {
            responses: true,
          },
        },
        rsvp: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const meals = await prisma.meal.findMany({
      orderBy: [{ day: "asc" }, { mealType: "asc" }],
    });

    const responses = family.members.flatMap((m) =>
      m.responses.map((r) => ({
        id: r.id,
        memberId: r.memberId,
        mealId: r.mealId,
        attending: r.attending,
      }))
    );

    return NextResponse.json({
      family: {
        id: family.id,
        itsId: family.itsId,
        headName: family.headName,
        lastName: family.lastName,
        phone: family.phone,
        email: family.email,
        editToken: family.editToken,
        createdAt: family.createdAt,
      },
      members: family.members.map((m) => ({
        id: m.id,
        familyId: m.familyId,
        name: m.name,
        ageGroup: m.ageGroup,
      })),
      meals,
      responses,
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
    const { memberId, mealId, attending } = body;

    if (!memberId || !mealId || attending === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { editToken: token },
    });

    if (!family) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Verify the member belongs to this family
    const member = await prisma.member.findFirst({
      where: { id: memberId, familyId: family.id },
    });

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.mealResponse.upsert({
      where: { memberId_mealId: { memberId, mealId } },
      update: { attending },
      create: { memberId, mealId, attending },
    });

    // Touch RSVP updatedAt
    await prisma.rsvp.update({
      where: { familyId: family.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ response: updated });
  } catch (error) {
    console.error("PATCH rsvp error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
