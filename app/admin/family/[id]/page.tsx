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
      responses: {
        include: { meal: true },
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
  const responseMap = new Map<string, number>(
    family.responses.map((r) => [r.mealId, r.attending as unknown as number])
  );
  const totalAttending = family.responses.reduce((s, r) => s + (r.attending as unknown as number), 0);

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
            <p className="text-gray-500 text-sm">
              {family.memberCount} {family.memberCount === 1 ? "member" : "members"}
            </p>
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

        <div className="flex gap-3">
          <Link href={`/rsvp/${family.editToken}`} target="_blank">
            <Button variant="outline" size="sm">
              Open RSVP Form ↗
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meal Selections</CardTitle>
              <span className="text-sm text-gray-500">
                {totalAttending} total attendees across all meals
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Lunch</TableHead>
                  <TableHead>Dinner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => {
                  const lunchMeal = meals.find(
                    (m) => m.day === day && m.mealType === "lunch"
                  );
                  const dinnerMeal = meals.find(
                    (m) => m.day === day && m.mealType === "dinner"
                  );
                  return (
                    <TableRow key={day}>
                      <TableCell className="font-medium">
                        {day === 10 ? "Day 10 (Ashura)" : `Day ${day}`}
                      </TableCell>
                      <TableCell>
                        {lunchMeal ? (
                          (() => {
                            const count = responseMap.get(lunchMeal.id) ?? 0;
                            return count > 0 ? (
                              <span className="text-green-600 font-medium">{count}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            );
                          })()
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {dinnerMeal ? (
                          (() => {
                            const count = responseMap.get(dinnerMeal.id) ?? 0;
                            return count > 0 ? (
                              <span className="text-green-600 font-medium">{count}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            );
                          })()
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
      </div>
    </main>
  );
}
