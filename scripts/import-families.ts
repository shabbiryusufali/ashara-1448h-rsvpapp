/**
 * Import families from a CSV file into the database.
 *
 * CSV format (header row required):
 *   ITS,HeadName,LastName,MemberName,AgeGroup
 *
 * AgeGroup is optional — defaults to "adult". Valid values: "adult", "child".
 *
 * Rows sharing the same ITS ID are grouped into one family.
 * The HeadName and LastName are taken from the first row for that ITS ID.
 *
 * Usage:
 *   npx tsx scripts/import-families.ts path/to/families.csv
 *   npx tsx scripts/import-families.ts path/to/families.csv --dry-run
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MemberRow {
  name: string;
  ageGroup: string;
}

interface FamilyRecord {
  itsId: string;
  headName: string;
  lastName: string;
  members: MemberRow[];
}

async function parseCsv(filePath: string): Promise<FamilyRecord[]> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const families = new Map<string, FamilyRecord>();
  let headerParsed = false;
  let colIts = 0;
  let colHead = 1;
  let colLast = 2;
  let colMember = 3;
  let colAge = 4;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const raw = line.trim();
    if (!raw) continue;

    // Simple CSV split — handles quoted fields with commas
    const cols = parseCsvLine(raw);

    if (!headerParsed) {
      const lower = cols.map((c) => c.toLowerCase().replace(/\s+/g, ""));
      colIts = lower.findIndex((c) => c === "its" || c === "itsid");
      colHead = lower.findIndex((c) => c === "headname" || c === "head");
      colLast = lower.findIndex((c) => c === "lastname" || c === "last");
      colMember = lower.findIndex(
        (c) => c === "membername" || c === "member" || c === "name"
      );
      colAge = lower.findIndex(
        (c) => c === "agegroup" || c === "age" || c === "type"
      );

      if (colIts === -1 || colMember === -1) {
        throw new Error(
          `Line ${lineNum}: CSV must have columns ITS (or ITSId) and MemberName (or Member/Name)`
        );
      }
      if (colHead === -1) colHead = 1;
      if (colLast === -1) colLast = 2;

      headerParsed = true;
      continue;
    }

    const itsId = cols[colIts]?.trim();
    const headName = cols[colHead]?.trim() ?? "";
    const lastName = cols[colLast]?.trim() ?? "";
    const memberName = cols[colMember]?.trim();
    const ageGroup =
      colAge !== -1
        ? (cols[colAge]?.trim().toLowerCase() ?? "adult")
        : "adult";

    if (!itsId || !memberName) {
      console.warn(`Line ${lineNum}: skipping empty ITS or member name`);
      continue;
    }

    const validAge = ageGroup === "child" ? "child" : "adult";

    if (!families.has(itsId)) {
      families.set(itsId, {
        itsId,
        headName: headName || memberName,
        lastName,
        members: [],
      });
    }

    families.get(itsId)!.members.push({ name: memberName, ageGroup: validAge });
  }

  return Array.from(families.values());
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function importFamilies(
  families: FamilyRecord[],
  dryRun: boolean
): Promise<void> {
  const meals = dryRun ? [] : await prisma.meal.findMany();

  let created = 0;
  let skipped = 0;

  for (const f of families) {
    const existing = dryRun
      ? null
      : await prisma.family.findUnique({ where: { itsId: f.itsId } });

    if (existing) {
      console.log(`  SKIP  ${f.itsId} — ${f.headName} ${f.lastName} (already exists)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  DRY   ${f.itsId} — ${f.headName} ${f.lastName} (${f.members.length} members)`
      );
      for (const m of f.members) {
        console.log(`          ${m.name} [${m.ageGroup}]`);
      }
      created++;
      continue;
    }

    const family = await prisma.family.create({
      data: {
        itsId: f.itsId,
        headName: f.headName,
        lastName: f.lastName,
        members: { create: f.members },
      },
      include: { members: true },
    });

    // Pre-create MealResponse rows so the RSVP form loads instantly
    for (const member of family.members) {
      for (const meal of meals) {
        await prisma.mealResponse.create({
          data: { memberId: member.id, mealId: meal.id, attending: false },
        });
      }
    }

    console.log(
      `  CREATE ${f.itsId} — ${f.headName} ${f.lastName} (${f.members.length} members)`
    );
    created++;
  }

  console.log(`\nDone. ${created} ${dryRun ? "would be created" : "created"}, ${skipped} skipped.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-families.ts <file.csv> [--dry-run]");
    process.exit(1);
  }

  const resolved = path.resolve(csvPath);
  console.log(`Importing from: ${resolved}${dryRun ? " (dry run)" : ""}\n`);

  const families = await parseCsv(resolved);
  console.log(`Parsed ${families.length} families.\n`);

  await importFamilies(families, dryRun);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
