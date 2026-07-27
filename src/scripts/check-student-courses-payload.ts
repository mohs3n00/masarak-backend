import { StudentDashboardService } from '../modules/student/services/student-dashboard.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { PlatformBrandingService } from '../modules/admin/services/platform-branding.service';
import { PublicController } from '../modules/admin/controllers/public.controller';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import 'dotenv/config';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const studentService = app.get(StudentDashboardService);

  const studentUserId = '4508147a-a802-4c38-bdd1-eb985ec0c3cd'; // student

  console.log(`Calling studentService.getMyCourses for student: ${studentUserId}`);
  const result = await studentService.getMyCourses(studentUserId, { take: 20, skip: 0 });
  console.log('Result payload JSON:');
  console.log(JSON.stringify(result, null, 2));

  await app.close();
}

main().catch(console.error);
