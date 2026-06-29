import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishRelease } from "@/lib/release/engine";

export async function POST(
  req: NextRequest
) {
  try {

    const formData =
      await req.formData();

    const product_id =
      formData.get("product_id")?.toString();

    const version =
      formData.get("version")?.toString();

    const title =
      formData.get("title")?.toString();

    const description =
      formData.get("description")?.toString();

    const draft =
      formData.get("draft") === "true";

    const prerelease =
      formData.get("prerelease") === "true";

    const files =
      formData
        .getAll("files")
        .filter(Boolean) as File[];

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          message: "product_id required",
        },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          message: "version required",
        },
        { status: 400 }
      );
    }

    const {
      data: product,
      error,
    } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    const result =
      await publishRelease({
        product,
        version,
        title:
          title ??
          version,
        description:
          description ?? "",
        draft,
        prerelease,
        files,
      });

    return NextResponse.json(
      result
    );

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
    success: true,
    service:
      "Release Engine",
    status: "running",
  });

}
