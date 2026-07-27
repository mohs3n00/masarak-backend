UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE "lockedUntil" IS NOT NULL OR "failedLoginAttempts" > 0;
