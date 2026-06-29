import { syncRepository } from "@/lib/github/contents";
import { createRelease } from "@/lib/github/release";
import { uploadAssets } from "@/lib/github/upload";

import { saveRelease } from "./database";
import { createManifest } from "./manifest";

export async function publishRelease(options: {
  product: any;
  version: string;
  title: string;
  description: string;
  files?: File[];
  draft?: boolean;
  prerelease?: boolean;
}) {

  const product = options.product;

  // Sync Repository
  await syncRepository(product);

  // Create GitHub Release
  const release = await createRelease(
    product.github_owner,
    product.github_repo,
    options.version,
    options.title,
    options.description,
    options.draft ?? false,
    options.prerelease ?? false
  );

  if (!release.ok) {
    return release;
  }

  // Upload Assets
  let uploadedAssets: any[] = [];

  if (
    options.files &&
    options.files.length > 0
  ) {

    const upload = await uploadAssets(
      release.data.upload_url,
      options.files
    );

    if (!upload.success) {
      return upload;
    }

    uploadedAssets = upload.assets;

  }

  // Generate Manifest
  const manifest =
    await createManifest(
      options.version,
      uploadedAssets
    );

  // Save Database
  await saveRelease({
    product_id: product.id,

    version: options.version,

    title: options.title,

    description:
      options.description,

    published:
      !options.draft,

    status:
      options.draft
        ? "Draft"
        : "Published",

    github_id:
      release.data.id,

    release_url:
      release.data.html_url,

    file_name:
      uploadedAssets[0]?.name ?? null,

    file_url:
      uploadedAssets[0]
        ?.browser_download_url ??
      null,

    file_size:
      uploadedAssets[0]?.size ??
      null,

    file_type:
      uploadedAssets[0]
        ?.content_type ??
      null,

    published_at:
      release.data.published_at,

    release_date:
      release.data.published_at,
  });

  return {
    success: true,
    release: release.data,
    assets: uploadedAssets,
    manifest,
  };

}
