import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking Super Admin Bootstrap status...');

    const superAdminExists = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (superAdminExists) {
      this.logger.log('Super Admin already exists. Bootstrap skipped.');
      return;
    }

    const name = process.env.SUPER_ADMIN_NAME;
    const username = process.env.SUPER_ADMIN_USERNAME;
    const email = process.env.SUPER_ADMIN_EMAIL;
    const plainPassword = process.env.SUPER_ADMIN_PASSWORD;
    const phone = process.env.SUPER_ADMIN_PHONE || '+000000000000';

    if (!name || !username || !email || !plainPassword) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.fatal('SUPER ADMIN bootstrap variables are missing in production! Faling startup.');
        process.exit(1);
      } else {
        this.logger.warn('SUPER ADMIN bootstrap variables missing. Skipping super admin creation in development.');
        return;
      }
    }

    this.logger.log('Initializing Super Admin account...');
    const hashedPassword = await argon2.hash(plainPassword);

    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'Super';
    const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Admin';

    try {
      await this.prisma.user.create({
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
          requiresPasswordChange: true,
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        this.logger.log('====================================');
        this.logger.log('Super Admin Created Successfully');
        this.logger.log(`Username: ${username}`);
        this.logger.log(`Email: ${email}`);
        this.logger.log(`Password: ${plainPassword}`);
        this.logger.log('====================================');
      } else {
        this.logger.log('Super Admin Created Successfully. Credentials are hidden in production.');
      }
    } catch (e) {
      this.logger.error('Failed to create Super Admin account', e);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}
