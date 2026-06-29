import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;

    if (!token)
      throw new Error("GITHUB_TOKEN not configured");

    if (!owner)
      throw new Error("GITHUB_OWNER not configured");

    const body = await req.json();

    const {
      repository,
      version,
      title,
      description,
      draft = false,
      prerelease = false,
    } = body;

    if (!repository)
      throw new Error("Repository is required");

    if (!version)
      throw new Error("Version is required");

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repository}/releases`,
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
          name: title || version,
          body: description || "",
          draft,
          prerelease,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          github: result,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      release: result,
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
