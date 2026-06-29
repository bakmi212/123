import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;

    if (!token || !owner) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub not configured",
        },
        { status: 500 }
      );
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Repository name required",
        },
        { status: 400 }
      );
    }

    const repo = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const response = await fetch(
      `https://api.github.com/orgs/${owner}/repos`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          name: repo,
          description: `${name} Release Repository`,
          private: true,
          auto_init: true,
        }),
      }
    );

    const github = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: github.message,
          github,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      owner,
      repo: github.name,
      url: github.html_url,
    });

  } catch (error: any) {
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
}
