import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ secret?: string }>;
}

export default async function AdminFamilyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { secret } = await searchParams;

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    redirect("/");
  }

  const family = await prisma.family.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          responses: {
            include: { meal: true },
          },
        },
      },
      rsvp: true,
    },
  });

  if (!family) {
    notFound();
  }

  const meals = await prisma.meal.findMany({
    orderBy: [{ day: "asc" }, { mealType: "asc" }],
  });

  const days = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin?secret=${secret}`}>
            <Button variant="ghost" size="sm">
              ← Back to Admin
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {family.headName} {family.lastName}
            </h1>
            <p className="text-gray-500 text-sm mt-1">ITS ID: {family.itsId}</p>
            {family.email && (
              <p className="text-gray-500 text-sm">{family.email}</p>
            )}
            {family.phone && (
              <p className="text-gray-500 text-sm">{family.phone}</p>
            )}
          </div>
          <div className="text-right">
            {family.rsvp ? (
              <Badge variant="success">RSVP Submitted</Badge>
            ) : (
              <Badge variant="outline">RSVP Pending</Badge>
            )}
            {family.rsvp && (
              <p className="text-xs text-gray-400 mt-1">
                Updated:{" "}
                {new Date(family.rsvp.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Edit RSVP link */}
        <div className="flex gap-3">
          <Link href={`/rsvp/${family.editToken}`} target="_blank">
            <Button variant="outline" size="sm">
              Open RSVP Form ↗
            </Button>
          </Link>
        </div>

        {/* Member meal matrix */}
        {family.members.map((member) => {
          const responseMap = new Map(
            member.responses.map((r) => [r.mealId, r.attending])
          );

          const totalAttending = member.responses.filter(
            (r) => r.attending
          ).length;

          return (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <Badge
                    variant={
                      member.ageGroup === "adult" ? "default" : "secondary"
                    }
                  >
                    {member.ageGroup}
                  </Badge>
                  <span className="text-sm text-gray-500 ml-auto">
                    {totalAttending} / {meals.length} meals
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Breakfast</TableHead>
                      <TableHead>Dinner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {days.map((day) => {
                      const bfMeal = meals.find(
                        (m) => m.day === day && m.mealType === "breakfast"
                      );
                      const dnMeal = meals.find(
                        (m) => m.day === day && m.mealType === "dinner"
                      );
                      return (
                        <TableRow key={day}>
                          <TableCell className="font-medium">
                            Day {day}
                          </TableCell>
                          <TableCell>
                            {bfMeal ? (
                              responseMap.get(bfMeal.id) ? (
                                <span className="text-green-600 font-medium">
                                  ✓ Yes
                                </span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {dnMeal ? (
                              responseMap.get(dnMeal.id) ? (
                                <span className="text-green-600 font-medium">
                                  ✓ Yes
                                </span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
