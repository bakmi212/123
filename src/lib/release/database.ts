import { supabaseAdmin } from "@/lib/supabase-admin";

export async function saveRelease(data: {
  product_id: string;

  version: string;

  title: string;

  description: string;

  published: boolean;

  status: string;

  github_id: number;

  release_url: string;

  file_name?: string | null;

  file_url?: string | null;

  file_size?: number | null;

  file_type?: string | null;

  published_at?: string | null;

  release_date?: string | null;
}) {

  const payload = {

    product_id: data.product_id,

    version: data.version,

    title: data.title,

    description: data.description,

    published: data.published,

    status: data.status,

    github_id: data.github_id,

    release_url: data.release_url,

    file_name: data.file_name ?? null,

    file_url: data.file_url ?? null,

    file_size: data.file_size ?? null,

    file_type: data.file_type ?? null,

    published_at:
      data.published_at ?? null,

    release_date:
      data.release_date ?? null,

    updated_at:
      new Date().toISOString(),

  };

  const result =
    await supabaseAdmin
      .from("updates")
      .upsert(payload, {
        onConflict: "product_id,version",
      })
      .select()
      .single();

  return result;

}
