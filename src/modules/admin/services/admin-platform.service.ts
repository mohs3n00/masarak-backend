import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdminRepository } from '../admin.repository';

@Injectable()
export class AdminPlatformService implements OnModuleInit {
  private readonly logger = new Logger(AdminPlatformService.name);
  private featureFlags: Record<string, boolean> = {};

  constructor(private readonly repo: AdminRepository) {}

  async onModuleInit() {
    try {
      await this.loadFeatureFlags();
    } catch (e: any) {
      this.logger.warn(`Failed to load feature flags during module init: ${e?.message || e}. Defaulting to empty flags.`);
    }
  }

  async loadFeatureFlags() {
    const flags = await this.repo.getFeatureFlags();
    flags.forEach((f) => {
      this.featureFlags[f.name] = f.isEnabled;
    });
  }

  isFeatureEnabled(featureName: string): boolean {
    return !!this.featureFlags[featureName];
  }
}
