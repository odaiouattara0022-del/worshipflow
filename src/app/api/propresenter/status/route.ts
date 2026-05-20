import { NextResponse } from "next/server";
import { checkConnection } from "@/lib/propresenter/client";

export async function GET() {
  const status = await checkConnection();
  return NextResponse.json(status);
}
