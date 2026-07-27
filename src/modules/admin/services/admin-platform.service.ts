import { Injectable, OnModuleInit } from '@nestjs/common';
import { AdminRepository } from '../admin.repository';

@Injectable()
export class AdminPlatformService implements OnModuleInit {
  private featureFlags: Record<string, boolean> = {};

  constructor(private readonly repo: AdminRepository) {}

  async onModuleInit() {
    await this.loadFeatureFlags();
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
