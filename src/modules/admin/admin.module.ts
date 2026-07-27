import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminPlatformService } from './services/admin-platform.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AcademicYearController } from './controllers/academic-year.controller';
import { AcademicYearService } from './services/academic-year.service';
import { AdminController } from './controllers/admin.controller';
import { AdminTaxonomyController } from './controllers/admin-taxonomy.controller';
import { AdminTaxonomyService } from './services/admin-taxonomy.service';
import { PublicController } from './controllers/public.controller';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { PlatformBrandingService } from './services/platform-branding.service';
import { PlatformBrandingController } from './controllers/platform-branding.controller';

@Module({
  imports: [CloudinaryModule],
  controllers: [AcademicYearController, AdminController, AdminTaxonomyController, PublicController, PlatformBrandingController],
  providers: [AdminRepository, AdminPlatformService, AdminDashboardService, AcademicYearService, AdminTaxonomyService, PlatformBrandingService],
  exports: [AdminRepository, AdminPlatformService],
})
export class AdminModule {}

