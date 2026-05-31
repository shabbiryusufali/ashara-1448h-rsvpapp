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
  // Seed 20 meals (day 1-10, breakfast + dinner)
  for (let day = 1; day <= 10; day++) {
    for (const mealType of ["breakfast", "dinner"]) {
      await prisma.meal.upsert({
        where: {
          id: `meal-day${day}-${mealType}`,
        },
        update: {},
        create: {
          id: `meal-day${day}-${mealType}`,
          day,
          mealType,
        },
      });
    }
  }

  console.log("Seeding families...");

  const families = [
    {
      itsId: "10000001",
      headName: "Mohammed",
      lastName: "Ali",
      phone: "555-0101",
      email: "mohammed.ali@example.com",
      members: [
        { name: "Mohammed Ali", ageGroup: "adult" },
        { name: "Fatema Ali", ageGroup: "adult" },
        { name: "Yusuf Ali", ageGroup: "child" },
        { name: "Zainab Ali", ageGroup: "child" },
      ],
    },
    {
      itsId: "10000002",
      headName: "Ibrahim",
      lastName: "Khan",
      phone: "555-0102",
      email: "ibrahim.khan@example.com",
      members: [
        { name: "Ibrahim Khan", ageGroup: "adult" },
        { name: "Mariam Khan", ageGroup: "adult" },
        { name: "Hassan Khan", ageGroup: "child" },
      ],
    },
    {
      itsId: "10000003",
      headName: "Hussain",
      lastName: "Rashid",
      phone: "555-0103",
      email: "hussain.rashid@example.com",
      members: [
        { name: "Hussain Rashid", ageGroup: "adult" },
        { name: "Sakina Rashid", ageGroup: "adult" },
      ],
    },
    {
      itsId: "10000004",
      headName: "Taher",
      lastName: "Noorani",
      phone: "555-0104",
      email: "taher.noorani@example.com",
      members: [
        { name: "Taher Noorani", ageGroup: "adult" },
        { name: "Ruqayyah Noorani", ageGroup: "adult" },
        { name: "Ali Noorani", ageGroup: "child" },
        { name: "Husna Noorani", ageGroup: "child" },
        { name: "Murtaza Noorani", ageGroup: "child" },
      ],
    },
    {
      itsId: "10000005",
      headName: "Mustafa",
      lastName: "Lokhandwala",
      phone: "555-0105",
      email: "mustafa.lokhandwala@example.com",
      members: [
        { name: "Mustafa Lokhandwala", ageGroup: "adult" },
        { name: "Shabbir Lokhandwala", ageGroup: "adult" },
      ],
    },
  ];

  for (const familyData of families) {
    const { members, ...family } = familyData;
    const created = await prisma.family.upsert({
      where: { itsId: family.itsId },
      update: {},
      create: {
        ...family,
        members: {
          create: members,
        },
      },
      include: { members: true },
    });

    // Create RSVP
    await prisma.rsvp.upsert({
      where: { familyId: created.id },
      update: {},
      create: { familyId: created.id },
    });

    // Create meal responses for all members × all meals
    const meals = await prisma.meal.findMany();
    for (const member of created.members) {
      for (const meal of meals) {
        await prisma.mealResponse.upsert({
          where: {
            memberId_mealId: { memberId: member.id, mealId: meal.id },
          },
          update: {},
          create: {
            memberId: member.id,
            mealId: meal.id,
            attending: false,
          },
        });
      }
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
