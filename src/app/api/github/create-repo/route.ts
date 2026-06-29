import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "GITHUB_TOKEN not configured",
        },
        {
          status: 500,
        }
      );
    }

    const body = await req.json();

    const name = body.name;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Repository name is required",
        },
        {
          status: 400,
        }
      );
    }

    const repo = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const response = await fetch(
      "https://api.github.com/user/repos",
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
          has_issues: true,
          has_projects: false,
          has_wiki: false,
        }),
      }
    );

    const github = await response.json();

    console.log("GitHub Status:", response.status);
    console.log("GitHub Response:", github);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            github.message ??
            "Failed to create repository",
          github,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      owner:
        owner ??
        github.owner?.login ??
        null,
      repo: github.name,
      url: github.html_url,
      github,
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
    success: true,
    message: "Create Repo API Ready",
    owner: process.env.GITHUB_OWNER,
  });
}
