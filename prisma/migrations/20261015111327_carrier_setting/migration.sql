-- CreateTable
CREATE TABLE "CarrierSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT,
    "trackingUrlTemplate" TEXT,
    "secretsEnc" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierSetting_shop_carrier_key" ON "CarrierSetting"("shop", "carrier");
