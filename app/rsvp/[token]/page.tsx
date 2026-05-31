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
      responses: true,
      rsvp: true,
    },
  });

  if (!family) {
    notFound();
  }

  const meals = await prisma.meal.findMany({
    orderBy: [{ day: "asc" }, { mealType: "asc" }],
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
        memberCount: family.memberCount,
        editToken: family.editToken,
        createdAt: family.createdAt,
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
      initialResponses={family.responses.map((r) => ({
        id: r.id,
        familyId: r.familyId,
        mealId: r.mealId,
        attending: r.attending,
      }))}
    />
  );
}
