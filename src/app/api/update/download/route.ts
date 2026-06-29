import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "id is required",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("updates")
        .select("file_url")
        .eq("id", id)
        .single();

    if (error || !data?.file_url) {
      return NextResponse.json(
        {
          success: false,
          message: "Update not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.redirect(
      data.file_url
    );
  } catch (error: any) {
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
