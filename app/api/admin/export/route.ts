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
    const families = await prisma.family.findMany({
      include: {
        responses: {
          include: { meal: true },
        },
        rsvp: true,
      },
      orderBy: { lastName: "asc" },
    });

    const meals = await prisma.meal.findMany({
      orderBy: [{ day: "asc" }, { mealType: "asc" }],
    });

    const mealHeaders = meals.map((m) => `Day ${m.day} ${m.mealType}`).join(",");

    const rows: string[] = [
      `Family ITS ID,Head Name,Last Name,Members,Email,Phone,${mealHeaders},RSVP Submitted`,
    ];

    for (const family of families) {
      const responseMap = new Map(
        family.responses.map((r) => [r.mealId, r.attending])
      );
      const mealValues = meals
        .map((m) => (responseMap.get(m.id) ? "Yes" : "No"))
        .join(",");

      rows.push(
        [
          family.itsId,
          `"${family.headName}"`,
          `"${family.lastName}"`,
          family.memberCount,
          family.email ? `"${family.email}"` : "",
          family.phone ? `"${family.phone}"` : "",
          mealValues,
          family.rsvp ? family.rsvp.updatedAt.toISOString() : "Not submitted",
        ].join(",")
      );
    }

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="rsvp-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
