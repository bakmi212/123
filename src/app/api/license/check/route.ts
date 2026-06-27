import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {

    try {

        const body = await req.json();

        const {
            license_key,
            hwid
        } = body;

        const { data: license } = await supabase

            .from("licenses")

            .select("*")

            .eq("license_key", license_key)

            .single();

        if (!license) {

            return NextResponse.json({

                success: false,

                message: "License tidak ditemukan."

            });

        }

        if (license.status !== "active") {

            return NextResponse.json({

                success: false,

                message: "License tidak aktif."

            });

        }

        if (license.hwid !== hwid) {

            return NextResponse.json({

                success: false,

                message: "HWID tidak cocok."

            });

        }

        await supabase

            .from("licenses")

            .update({

                last_used_at: new Date()

            })

            .eq("id", license.id);

        return NextResponse.json({

            success: true,

            message: "License Valid"

        });

    }

    catch {

        return NextResponse.json({

            success: false,

            message: "Server Error"

        }, {

            status: 500

        });

    }

}
