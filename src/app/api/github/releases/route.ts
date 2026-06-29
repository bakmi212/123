import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    // Verifikasi secret dari GitHub Actions
    const secret = req.headers.get("x-webhook-secret");

    if (secret !== process.env.GITHUB_WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const release = body.release;

    if (!release) {
      return NextResponse.json(
        {
          success: false,
          message: "Release payload not found",
        },
        {
          status: 400,
        }
      );
    }

    const payload = {
      version: release.tag_name,
      title: release.name || release.tag_name,
      description: release.body || "",
      type: "Feature",
      status: "Published",
      published: true,
    };

    const { error } = await supabaseAdmin
      .from("updates")
      .upsert(payload, {
        onConflict: "version",
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Release synchronized successfully",
      version: payload.version,
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
