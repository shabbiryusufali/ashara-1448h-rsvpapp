import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const family = await prisma.family.findUnique({
      where: { editToken: token },
    });

    if (!family) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const rsvp = await prisma.rsvp.upsert({
      where: { familyId: family.id },
      update: { updatedAt: new Date() },
      create: { familyId: family.id },
    });

    return NextResponse.json({ rsvp, success: true });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
