import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("GitHub Release Payload:", body);

    return NextResponse.json({
      success: true,
      message: "Webhook received",
      payload: body,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid payload",
      },
      {
        status: 400,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "GitHub Release Webhook",
    status: "running",
  });
}
