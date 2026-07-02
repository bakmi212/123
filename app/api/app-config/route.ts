import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

    const { data, error } = await supabase
        .from("app_config")
        .select("*")
        .eq("id", 1)
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
        banner_url: data.banner_url,
        banner_updated_at: data.banner_updated_at,
        maintenance: data.maintenance,
        minimum_version: data.minimum_version,
        popup: {
            enabled: !!data.popup_title,
            title: data.popup_title ?? "",
            message: data.popup_message ?? ""
        },
        updated_at: data.updated_at
    });
}
