import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [users, totalDocuments, totalFeedback, recentFeedback] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        documents: { select: { createdAt: true, lastOpenedAt: true } },
      },
    }),
    prisma.document.count(),
    prisma.feedback.count(),
    prisma.feedback.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const totalUsers = users.length;
  const uploaderCount = users.filter((user) => user.documents.length > 0).length;

  const userRows = users
    .map((user) => {
      const activityTimestamps = user.documents.map((doc) => (doc.lastOpenedAt ?? doc.createdAt).getTime());
      const lastActive = activityTimestamps.length > 0 ? new Date(Math.max(...activityTimestamps)).toISOString() : null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        documentCount: user.documents.length,
        lastActive,
      };
    })
    .sort((a, b) => {
      if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive);
      if (a.lastActive) return -1;
      if (b.lastActive) return 1;
      return b.documentCount - a.documentCount;
    });

  return NextResponse.json({
    totalUsers,
    uploaderCount,
    uploaderPercentage: totalUsers > 0 ? Math.round((uploaderCount / totalUsers) * 100) : 0,
    totalDocuments,
    totalFeedback,
    users: userRows,
    recentFeedback: recentFeedback.map((item) => ({
      id: item.id,
      documentTitle: item.documentTitle,
      sectionTitle: item.sectionTitle,
      pageNumber: item.pageNumber,
      message: item.message,
      createdAt: item.createdAt.toISOString(),
      user: item.user,
    })),
  });
}
