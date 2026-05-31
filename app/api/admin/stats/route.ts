import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;

  const headerSecret = request.headers.get("x-admin-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");

  return headerSecret === adminSecret || querySecret === adminSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meals = await prisma.meal.findMany({
      orderBy: [{ day: "asc" }, { mealType: "asc" }],
      include: {
        responses: {
          where: { attending: true },
        },
      },
    });

    const stats = meals.map((meal) => ({
      mealId: meal.id,
      day: meal.day,
      mealType: meal.mealType,
      count: meal.responses.length,
    }));

    // Total families that have RSVPed
    const rsvpCount = await prisma.rsvp.count();
    const familyCount = await prisma.family.count();

    return NextResponse.json({ stats, rsvpCount, familyCount });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
