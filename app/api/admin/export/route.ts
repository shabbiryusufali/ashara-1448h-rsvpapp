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

    const mealHeaders = meals
      .map((m) => {
        if (m.day === 10 && m.mealType === "dinner") return "Day 10 Ashura Dinner";
        return `Day ${m.day} ${m.mealType}`;
      })
      .join(",");

    // Compute totals per meal across all families
    const mealTotals = new Map<string, number>(meals.map((m) => [m.id, 0]));
    for (const family of families) {
      for (const r of family.responses) {
        mealTotals.set(r.mealId, (mealTotals.get(r.mealId) ?? 0) + (r.attending as unknown as number));
      }
    }

    const totalMealValues = meals.map((m) => mealTotals.get(m.id) ?? 0).join(",");

    const rows: string[] = [
      `ITS ID,Head Name,Last Name,Members,Email,Phone,${mealHeaders},RSVP Submitted`,
      // Totals row — ID -1, name "Total"
      `-1,Total,,,,,${totalMealValues},`,
    ];

    for (const family of families) {
      const responseMap = new Map<string, number>(
        family.responses.map((r) => [r.mealId, r.attending as unknown as number])
      );
      const mealValues = meals
        .map((m) => responseMap.get(m.id) ?? 0)
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
