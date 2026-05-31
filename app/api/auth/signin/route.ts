import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itsId, lastName } = body;

    if (!itsId || !lastName) {
      return NextResponse.json(
        { error: "ITS ID and last name are required." },
        { status: 400 }
      );
    }

    const itsIdStr = String(itsId).trim();
    const lastNameStr = String(lastName).trim();

    const family = await prisma.family.findUnique({
      where: { itsId: itsIdStr },
    });

    if (!family) {
      return NextResponse.json(
        { error: "No RSVP found for this ITS ID. Please register a new RSVP from the home page." },
        { status: 404 }
      );
    }

    if (family.lastName.toLowerCase() !== lastNameStr.toLowerCase()) {
      return NextResponse.json(
        { error: "Last name does not match our records." },
        { status: 401 }
      );
    }

    return NextResponse.json({ editToken: family.editToken });
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
