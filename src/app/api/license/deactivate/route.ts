import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {

    try {

        const body = await req.json();

        const { license_key } = body;

        if (!license_key) {

            return NextResponse.json({
                success: false,
                message: "License Key wajib diisi."
            }, { status: 400 });

        }

        const { data: license, error } = await supabase
            .from("licenses")
            .select("*")
            .eq("license_key", license_key)
            .single();

        if (error || !license) {

            return NextResponse.json({
                success: false,
                message: "License tidak ditemukan."
            });

        }

        const { error: updateError } = await supabase
            .from("licenses")
            .update({

                status: "inactive",

                hwid: null,

                activated_at: null,

                last_used_at: null

            })
            .eq("id", license.id);

        if (updateError) {

            return NextResponse.json({
                success: false,
                message: updateError.message
            });

        }

        return NextResponse.json({

            success: true,

            message: "License berhasil dinonaktifkan."

        });

    } catch (err) {

        return NextResponse.json({

            success: false,

            message: "Server Error"

        }, {

            status: 500

        });

    }

}
