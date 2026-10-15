-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "CarrierSetting" (
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

-- CreateTable
CREATE TABLE "TrackingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "awb" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierSetting_shop_carrier_key" ON "CarrierSetting"("shop", "carrier");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingSnapshot_shop_carrier_awb_key" ON "TrackingSnapshot"("shop", "carrier", "awb");
