import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlatformBrandingDto {
  @IsString()
  @IsOptional()
  url: string;

  @IsBoolean()
  @IsOptional()
  isEnabled: boolean;

  @IsBoolean()
  @IsOptional()
  showInFooter: boolean;

  @IsBoolean()
  @IsOptional()
  showInExport: boolean;
}

@Injectable()
export class PlatformBrandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllConfig() {
    return this.prisma.platformBranding.findMany({
      orderBy: { platform: 'asc' },
    });
  }

  async getPublicConfig() {
    return this.prisma.platformBranding.findMany({
      where: { isEnabled: true },
      orderBy: { platform: 'asc' },
    });
  }

  async upsertConfig(platform: string, data: UpdatePlatformBrandingDto) {
    return this.prisma.platformBranding.upsert({
      where: { platform },
      update: {
        url: data.url,
        isEnabled: data.isEnabled,
        showInFooter: data.showInFooter,
        showInExport: data.showInExport,
      },
      create: {
        platform,
        url: data.url,
        isEnabled: data.isEnabled,
        showInFooter: data.showInFooter,
        showInExport: data.showInExport,
      },
    });
  }
}
