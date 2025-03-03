-- CreateTable
CREATE TABLE "City" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL
);
