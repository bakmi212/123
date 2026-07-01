import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const productId =
      searchParams.get("product_id");

    const platform =
      searchParams.get("platform") ??
      "desktop";

    const currentVersion =
      searchParams.get("version");

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "product_id is required",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("updates")
        .select("*")
        .eq("product_id", productId)
        .eq("platform", platform)
        .eq("published", true)
        .order("published_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
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

    if (!data) {
      return NextResponse.json({
        success: true,
        hasUpdate: false,
      });
    }

    const hasUpdate =
      !currentVersion ||
      currentVersion < data.version;

    return NextResponse.json({
      success: true,

      hasUpdate,

      latestVersion:
        data.version,

      currentVersion,

      title:
        data.title,

      description:
        data.description,

      releaseNotes:
        data.release_notes,

      downloadUrl:
        data.file_url,

      fileName:
        data.file_name,

      fileSize:
        data.file_size,

      releaseDate:
        data.release_date,

      githubUrl:
        data.github_url,

      mandatory: false,
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
