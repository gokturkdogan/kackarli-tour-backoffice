import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push/notifications";

export async function GET() {
  const config = getVapidConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Push bildirimleri yapılandırılmamış" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey: config.publicKey });
}
