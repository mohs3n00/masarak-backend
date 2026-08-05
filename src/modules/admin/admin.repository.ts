import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async upsertFeatureFlag(name: string, isEnabled: boolean) {
    return this.prisma.featureFlag.upsert({
      where: { name },
      update: { isEnabled },
      create: { name, isEnabled, description: name },
    });
  }

  async getMaintenanceConfig() {
    return this.prisma.maintenanceConfig.findFirst();
  }
}
