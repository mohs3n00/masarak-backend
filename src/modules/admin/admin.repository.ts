import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async getMaintenanceConfig() {
    return this.prisma.maintenanceConfig.findFirst();
  }
}
