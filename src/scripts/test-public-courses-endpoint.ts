import { PrismaClient, CourseStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Let's mock NestJS controller execution for /public/courses query
  const take = 20;
  const skip = 0;
  const q = undefined;
  const category = undefined;
  const subject = undefined;
  const grade = undefined;
  const sort = undefined;

  // Wait, let's query the database exactly as NestJS would do
  const where: any = { status: CourseStatus.PUBLISHED, isPublished: true };

  // If there was an extra parameter teacherId, what happens?
  // In the NestJS endpoint, we don't read teacherId. But wait, does it crash?
  // No, the controller doesn't throw because query params are not validated in that way.

  const [data, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        instructors: {
          where: { isOwner: true },
          include: {
            teacher: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
        _count: { select: { enrollments: true, sections: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  const items = data.map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    price: c.price,
    originalPrice: c.originalPrice,
    accessType: c.accessType,
    grade: c.grades[0] || null,
    averageRating: c.averageRating,
    reviewCount: c.reviewCount,
    enrollmentCount: c._count.enrollments,
    lessonsCount: c._count.sections,
    category: c.subject ? { id: c.subject.id, name: c.subject.name, slug: c.subject.slug } : null,
    teacher: c.instructors[0]?.teacher?.user
      ? {
          id: c.instructors[0].teacher.user.id,
          name: c.instructors[0].teacher.user.name,
          avatar: c.instructors[0].teacher.user.avatar,
        }
      : null,
  }));

  console.log(`Success: returned ${items.length} items`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
