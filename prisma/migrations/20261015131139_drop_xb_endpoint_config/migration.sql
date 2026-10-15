/*
  Warnings:

  - You are about to drop the column `authHeaderName` on the `CarrierSetting` table. All the data in the column will be lost.
  - You are about to drop the column `authScheme` on the `CarrierSetting` table. All the data in the column will be lost.
  - You are about to drop the column `endpointUrl` on the `CarrierSetting` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarrierSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "useStaging" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT,
    "trackingUrlTemplate" TEXT,
    "secretsEnc" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CarrierSetting" ("accountId", "carrier", "enabled", "id", "secretsEnc", "shop", "trackingUrlTemplate", "updatedAt", "useStaging") SELECT "accountId", "carrier", "enabled", "id", "secretsEnc", "shop", "trackingUrlTemplate", "updatedAt", "useStaging" FROM "CarrierSetting";
DROP TABLE "CarrierSetting";
ALTER TABLE "new_CarrierSetting" RENAME TO "CarrierSetting";
CREATE UNIQUE INDEX "CarrierSetting_shop_carrier_key" ON "CarrierSetting"("shop", "carrier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
