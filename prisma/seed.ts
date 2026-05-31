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
  console.log("Seeding meals...");
  for (let day = 1; day <= 10; day++) {
    for (const mealType of ["lunch", "dinner"]) {
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
