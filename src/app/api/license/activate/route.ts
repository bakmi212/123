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
            hwid,
            product,
            version
        } = body;

        if (!license_key || !hwid) {

            return NextResponse.json({

                success: false,

                message: "License Key atau HWID kosong."

            }, { status: 400 });

        }

        // ==========================
        // CEK LICENSE
        // ==========================

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

        // ==========================
        // STATUS
        // ==========================

        if (license.status !== "active") {

            return NextResponse.json({

                success: false,

                message: "License tidak aktif."

            });

        }

        // ==========================
        // EXPIRED
        // ==========================

        if (license.expires_at) {

            const expired = new Date(
                license.expires_at
            );

            if (expired < new Date()) {

                return NextResponse.json({

                    success: false,

                    message: "License Expired."

                });

            }

        }

        // ==========================
        // PERTAMA KALI AKTIVASI
        // ==========================

        if (!license.hwid) {

            await supabase

                .from("licenses")

                .update({

                    hwid,

                    activated_at: new Date(),

                    last_used_at: new Date()

                })

                .eq("id", license.id);

            return NextResponse.json({

                success: true,

                message: "License Activated"

            });

        }

        // ==========================
        // HWID COCOK
        // ==========================

        if (license.hwid === hwid) {

            await supabase

                .from("licenses")

                .update({

                    last_used_at: new Date()

                })

                .eq("id", license.id);

            return NextResponse.json({

                success: true,

                message: "Welcome Back"

            });

        }

        // ==========================
        // HWID BERBEDA
        // ==========================

        return NextResponse.json({

            success: false,

            message: "License sudah digunakan pada perangkat lain."

        });

    }

    catch (err) {

        return NextResponse.json({

            success: false,

            message: "Server Error"

        }, {

            status: 500

        });

    }

}
