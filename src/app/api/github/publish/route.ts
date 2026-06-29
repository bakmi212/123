import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "GITHUB_TOKEN not found",
        },
        { status: 500 }
      );
    }

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          message: "GITHUB_OWNER not found",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    return NextResponse.json({
      success: true,
      message: "GitHub Publish API Ready",
      owner,
      repository: body.repository,
      version: body.version,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
