import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PlatformBrandingService, UpdatePlatformBrandingDto } from '../services/platform-branding.service';

@ApiTags('Admin - Platform Branding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/platform-branding')
export class PlatformBrandingController {
  constructor(private readonly platformBrandingService: PlatformBrandingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all platform branding configurations' })
  getAllConfig() {
    return this.platformBrandingService.getAllConfig();
  }

  @Patch(':platform')
  @ApiOperation({ summary: 'Update or create a platform branding configuration' })
  upsertConfig(
    @Param('platform') platform: string,
    @Body() data: UpdatePlatformBrandingDto,
  ) {
    return this.platformBrandingService.upsertConfig(platform, data);
  }
}
