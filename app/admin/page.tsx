import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminPageProps {
  searchParams: Promise<{ secret?: string; q?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { secret, q } = await searchParams;

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    redirect("/");
  }

  const meals = await prisma.meal.findMany({
    orderBy: [{ day: "asc" }, { mealType: "asc" }],
    include: {
      responses: { where: { attending: true } },
    },
  });

  const families = await prisma.family.findMany({
    where: q
      ? {
          OR: [
            { itsId: { contains: q } },
            { headName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      rsvp: true,
    },
    orderBy: { lastName: "asc" },
  });

  const days = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <a href={`/api/admin/export?secret=${secret}`} download>
            <Button variant="outline" size="sm">
              Export CSV
            </Button>
          </a>
        </div>

        {/* Meal Count Table */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Attendance by Day</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                  const lunch = meals.find(
                    (m) => m.day === day && m.mealType === "lunch"
                  );
                  const dinner = meals.find(
                    (m) => m.day === day && m.mealType === "dinner"
                  );
                  return (
                    <TableRow key={day}>
                      <TableCell className="font-medium">Day {day}</TableCell>
                      <TableCell>
                        {lunch ? (
                          <Badge variant="secondary">
                            {lunch.responses.length}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {dinner ? (
                          <Badge variant="secondary">
                            {dinner.responses.length}
                          </Badge>
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

        {/* Family Search */}
        <Card>
          <CardHeader>
            <CardTitle>Families</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="flex gap-2">
              <input type="hidden" name="secret" value={secret} />
              <Input
                name="q"
                placeholder="Search by ITS ID or name..."
                defaultValue={q ?? ""}
                className="max-w-xs"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
              {q && (
                <a href={`/admin?secret=${secret}`}>
                  <Button variant="ghost" type="button">
                    Clear
                  </Button>
                </a>
              )}
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ITS ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>RSVP Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-mono text-sm">
                      {family.itsId}
                    </TableCell>
                    <TableCell>
                      {family.headName} {family.lastName}
                    </TableCell>
                    <TableCell>{family.memberCount}</TableCell>
                    <TableCell>
                      {family.rsvp ? (
                        <Badge variant="success">Submitted</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {family.rsvp
                        ? new Date(family.rsvp.updatedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/family/${family.id}?secret=${secret}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {families.length === 0 && (
              <p className="text-center text-gray-500 py-8">No families found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
