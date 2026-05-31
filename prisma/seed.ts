import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { loadEnvFile } from "node:process";
import path from "node:path";

try {
  loadEnvFile(path.join(process.cwd(), ".env"));
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Migrate attending column from boolean to int if needed
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "MealResponse" ALTER COLUMN attending TYPE INTEGER USING attending::int`
    );
    console.log("Migrated attending column to INTEGER");
  } catch {
    // Already integer, skip
  }

  console.log("Seeding meals...");

  // Day 10 is Ashura (fasting day) — dinner only; remove lunch if it exists
  const day10Lunch = await prisma.meal.findUnique({
    where: { id: "meal-day10-lunch" },
  });
  if (day10Lunch) {
    await prisma.mealResponse.deleteMany({ where: { mealId: "meal-day10-lunch" } });
    await prisma.meal.delete({ where: { id: "meal-day10-lunch" } });
    console.log("Removed Day 10 lunch (Ashura is a fasting day)");
  }

  for (let day = 1; day <= 10; day++) {
    const mealTypes = day === 10 ? ["dinner"] : ["lunch", "dinner"];
    for (const mealType of mealTypes) {
      await prisma.meal.upsert({
        where: { id: `meal-day${day}-${mealType}` },
        update: {},
        create: {
          id: `meal-day${day}-${mealType}`,
          day,
          mealType,
        },
      });
    }
  }
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
