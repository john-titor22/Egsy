-- Safe migration: String → Role enum, add mustChangePassword
-- Existing values 'ADMIN' and 'OWNER' cast cleanly to the enum.

-- 1. Create the enum type
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OWNER', 'WORKER');

-- 2. Drop the string default first, then cast column, then re-set default
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OWNER'::"Role";

-- 3. Add mustChangePassword column
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
