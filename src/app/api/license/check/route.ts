import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {

    const { license_key, hwid } = await req.json();

    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", license_key)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        success: false,
        message: error.message
      });
    }

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
        last_used_at: new Date().toISOString()
      })
      .eq("id", license.id);

    return NextResponse.json({
      success: true,
      message: "License Valid"
    });

  } catch (err: any) {

    return NextResponse.json(
      {
        success: false,
        message: err.message
      },
      { status: 500 }
    );

  }
}
