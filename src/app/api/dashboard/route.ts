import { NextResponse } from "next/server";

export async function GET() {

    return NextResponse.json({

        version: "1.0.0",

        last_update: [

            "Improve License System",

            "Improve Rendering Engine",

            "Bug Fixes"

        ],

        news: [

            "AI Voice Coming Soon",

            "New Thumbnail Engine",

            "More Templates Available"

        ]

    });

}
