import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import * as argon2 from 'argon2';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const superAdminExists = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (superAdminExists) {
    console.log('Super Admin account already exists. Skipping creation.');
    return;
  }

  const name = process.env.SUPER_ADMIN_NAME || 'Masarak Administrator';
  const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
  const plainPassword =
    process.env.SUPER_ADMIN_PASSWORD || 'VeryStrongRandomPassword';
  // Super admin requires a valid phone by schema, providing a default strong stub if none
  const phone = process.env.SUPER_ADMIN_PHONE || '+000000000000';

  const hashedPassword = await argon2.hash(plainPassword);

  const nameParts = name.split(' ');
  const firstName = nameParts[0] || 'Super';
  const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Admin';

  const admin = await prisma.user.create({
    data: {
      email,
      username,
      phone,
      password: hashedPassword,
      firstName,
      middleName: '',
      lastName: '',
      familyName,
      name,
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
      requiresPasswordChange: true, // Forces change on first login
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('====================================');
    console.log('Super Admin Created Successfully');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', plainPassword);
    console.log('====================================');
  } else {
    console.log('Super Admin Created Successfully. Credentials are hidden in production.');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
