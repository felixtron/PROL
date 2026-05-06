import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/queries/notifications";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "10", 10);
    // Clamp to reasonable bounds: a malicious pageSize=999999 would
    // load the entire notifications history into memory.
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(100, Math.max(1, pageSizeRaw))
      : 10;

    const data = await getNotifications(page, pageSize);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllAsRead();
    } else if (notificationId) {
      await markAsRead(notificationId);
    } else {
      return NextResponse.json(
        { error: "notificationId o markAll requerido" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Error al actualizar notificación" },
      { status: 500 }
    );
  }
}
