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

    const body = await req.json();

    const {
      product_id,
      version,
      title,
      description,
      draft = false,
      prerelease = false,
    } = body;

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

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        id,
        name,
        github_owner,
        github_repo,
        github_branch
      `
      )
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

    if (!product.github_owner || !product.github_repo) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub repository not configured",
        },
        { status: 400 }
      );
    }

    const githubResponse = await fetch(
      `https://api.github.com/repos/${product.github_owner}/${product.github_repo}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          tag_name: version,
          target_commitish:
            product.github_branch ?? "main",
          name: title || version,
          body: description || "",
          draft,
          prerelease,
        }),
      }
    );

    const github = await githubResponse.json();

    if (!githubResponse.ok) {
      console.error(github);

      return NextResponse.json(
        {
          success: false,
          message:
            github.message ??
            "Failed to create GitHub Release",
          github,
        },
        {
          status: githubResponse.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "GitHub Release created successfully",
      release: github,
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
