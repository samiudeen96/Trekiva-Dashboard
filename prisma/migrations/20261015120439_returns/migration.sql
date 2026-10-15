-- CreateTable
CREATE TABLE "ReturnSetting" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "windowDays" INTEGER,
    "exchangesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "finalSaleTag" TEXT NOT NULL DEFAULT 'final-sale'
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ReturnItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_reference_key" ON "ReturnRequest"("reference");

-- CreateIndex
CREATE INDEX "ReturnRequest_shop_customerId_orderId_idx" ON "ReturnRequest"("shop", "customerId", "orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_shop_status_createdAt_idx" ON "ReturnRequest"("shop", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnItem_requestId_idx" ON "ReturnItem"("requestId");

-- CreateIndex
CREATE INDEX "ReturnEvent_requestId_idx" ON "ReturnEvent"("requestId");
