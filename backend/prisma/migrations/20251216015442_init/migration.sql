-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostname" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "os_type" TEXT,
    "os_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetricsHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT,
    "timestamp" DATETIME NOT NULL,
    "cpu_usage" REAL,
    "memory_usage" REAL,
    "memory_total" INTEGER,
    "memory_used" INTEGER,
    CONSTRAINT "MetricsHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" TEXT,
    "timestamp" DATETIME NOT NULL,
    "pid" INTEGER NOT NULL,
    "name" TEXT,
    "user" TEXT,
    "cpu_usage" REAL,
    "memory_usage" REAL,
    "state" TEXT,
    CONSTRAINT "ProcessSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer'
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
