import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

    const { data, error } = await supabase
        .from("app_config")
        .select("config, updated_at")
        .eq("id", true)
        .single();

    if (error) {

        return NextResponse.json(
            {
                success: false,
                message: error.message
            },
            {
                status: 500
            }
        );

    }

    return NextResponse.json({

        success: true,

        updated_at: data.updated_at,

        ...data.config

    });

}
