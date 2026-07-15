import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@kackarlitur.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123456";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: "ADMIN", name },
    create: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
