import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { withAuth } from "@/middlewares/withAuth";

// handler function to get notifications for user
async function getNotifications(request) { 

    const user = request.user; 
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ notifications }, { status: 200 });

    } catch (error) {
        console.error("Error getting notifications:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    
}

// withAuth middleware ensures request.user is set
export const GET = withAuth(getNotifications);
