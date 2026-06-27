import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const licenseKey = body.license_key?.trim();
    const hwid = body.hwid?.trim();

    if (!licenseKey || !hwid) {
      return NextResponse.json(
        {
          success: false,
          message: "License Key atau HWID kosong."
        },
        { status: 400 }
      );
    }

    console.log("================================");
    console.log("LICENSE :", licenseKey);
    console.log("HWID    :", hwid);

    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", licenseKey)
      .maybeSingle();

    console.log("SUPABASE ERROR :", error);
    console.log("LICENSE DATA :", license);

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

    if (license.expires_at) {
      const expired = new Date(license.expires_at);

      if (expired < new Date()) {
        return NextResponse.json({
          success: false,
          message: "License Expired."
        });
      }
    }

    // Aktivasi pertama
    if (!license.hwid) {
      const { error: updateError } = await supabase
        .from("licenses")
        .update({
          hwid: hwid,
          activated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
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
        message: "License Activated"
      });
    }

    // HWID cocok
    if (license.hwid === hwid) {
      await supabase
        .from("licenses")
        .update({
          last_used_at: new Date().toISOString()
        })
        .eq("id", license.id);

      return NextResponse.json({
        success: true,
        message: "Welcome Back"
      });
    }

    // HWID berbeda
    return NextResponse.json({
      success: false,
      message: "License sudah digunakan di perangkat lain."
    });

  } catch (err: any) {

    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err.message
      },
      {
        status: 500
      }
    );
  }
}
