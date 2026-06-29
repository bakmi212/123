import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-webhook-secret");

    if (
      secret !== process.env.GITHUB_WEBHOOK_SECRET
    ) {
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

    const asset =
      release.assets?.[0] ?? null;

    const repository =
      body.repository;

    const { data: product } =
      await supabaseAdmin
        .from("products")
        .select("id")
        .eq(
          "github_repo",
          repository.name
        )
        .single();

    const payload = {
      product_id:
        product?.id ?? null,

      platform:
        asset?.name?.endsWith(".apk") ||
        asset?.name?.endsWith(".aab")
          ? "mobile"
          : "desktop",

      version: release.tag_name,

      title:
        release.name ||
        release.tag_name,

      description:
        release.body || "",

      type: "Feature",

      status:
        release.prerelease
          ? "Draft"
          : "Published",

      published:
        !release.prerelease,

      github_id: release.id,

      release_url:
        release.html_url,

      download_url:
        asset?.browser_download_url ??
        null,

      asset_name:
        asset?.name ?? null,

      asset_size:
        asset?.size ?? null,

      created_at:
        release.created_at,

      published_at:
        release.published_at,
    };

    const { data, error } =
      await supabaseAdmin
        .from("updates")
        .upsert(payload, {
          onConflict: "version",
        })
        .select()
        .single();

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
      message:
        "Release synchronized successfully",
      data,
    });

  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ??
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service:
      "GitHub Release Webhook",
    status: "running",
    timestamp:
      new Date().toISOString(),
  });
}
