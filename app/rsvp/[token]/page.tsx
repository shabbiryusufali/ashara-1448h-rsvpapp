import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RsvpForm from "./RsvpForm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function RsvpPage({ params }: PageProps) {
  const { token } = await params;

  const family = await prisma.family.findUnique({
    where: { editToken: token },
    include: {
      members: true,
      rsvp: true,
    },
  });

  if (!family) {
    notFound();
  }

  const meals = await prisma.meal.findMany({
    orderBy: [{ day: "asc" }, { mealType: "asc" }],
  });

  const responses = await prisma.mealResponse.findMany({
    where: {
      member: { familyId: family.id },
    },
  });

  return (
    <RsvpForm
      family={{
        id: family.id,
        itsId: family.itsId,
        headName: family.headName,
        lastName: family.lastName,
        phone: family.phone,
        email: family.email,
        editToken: family.editToken,
        createdAt: family.createdAt,
        members: family.members,
        rsvp: family.rsvp
          ? {
              id: family.rsvp.id,
              familyId: family.rsvp.familyId,
              submittedAt: family.rsvp.submittedAt,
              updatedAt: family.rsvp.updatedAt,
            }
          : null,
      }}
      meals={meals}
      initialResponses={responses.map((r) => ({
        id: r.id,
        memberId: r.memberId,
        mealId: r.mealId,
        attending: r.attending,
      }))}
    />
  );
}
