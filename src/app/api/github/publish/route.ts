import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "GITHUB_TOKEN not configured",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();

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

    const file =
      formData.get("file") as File | null;

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          message: "product_id is required",
        },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          message: "version is required",
        },
        { status: 400 }
      );
    }

    const { data: product, error } =
      await supabaseAdmin
        .from("products")
        .select(`
          id,
          name,
          github_owner,
          github_repo,
          github_branch
        `)
        .eq("id", product_id)
        .single();

    if (error || !product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    if (
      !product.github_owner ||
      !product.github_repo
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GitHub repository not configured",
        },
        { status: 400 }
      );
    }

    const releaseResponse = await fetch(
      `https://api.github.com/repos/${product.github_owner}/${product.github_repo}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type":
            "application/json",
          "X-GitHub-Api-Version":
            "2022-11-28",
        },
        body: JSON.stringify({
          tag_name: version,
          target_commitish:
            product.github_branch ??
            "main",
          name: title || version,
          body: description || "",
          draft,
          prerelease,
        }),
      }
    );

    const release =
      await releaseResponse.json();

    if (!releaseResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            release.message ??
            "Failed to create release",
          github: release,
        },
        {
          status: releaseResponse.status,
        }
      );
    }

    let asset = null;

    if (file) {
      const uploadUrl =
        release.upload_url.replace(
          "{?name,label}",
          `?name=${encodeURIComponent(
            file.name
          )}`
        );

      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      const uploadResponse = await fetch(
        uploadUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              file.type ||
              "application/octet-stream",
            "Content-Length":
              buffer.length.toString(),
          },
          body: buffer,
        }
      );

      asset =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Failed to upload release asset",
            github: asset,
          },
          {
            status:
              uploadResponse.status,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "GitHub Release published successfully",
      release,
      asset,
      download_url:
        asset?.browser_download_url ??
        null,
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
