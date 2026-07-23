-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studySessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Section_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
