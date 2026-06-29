import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const product =
      searchParams.get("product");

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "product required",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("updates")
        .select("*")
        .eq("product_id", product)
        .eq("published", true)
        .order("release_date", {
          ascending: false,
        })
        .limit(1)
        .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          message: "No release found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      version: data.version,

      title: data.title,

      description:
        data.description,

      download_url:
        data.file_url,

      github_release:
        data.release_url,

      published_at:
        data.release_date,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        message:
          error.message,
      },
      {
        status: 500,
      }
    );

  }
}
