import { syncRepository } from "@/lib/github/contents";
import { createRelease } from "@/lib/github/release";

import { uploadAssets } from "./upload";
import { saveRelease } from "./database";

import { createManifest } from "./manifest";

export async function publishRelease(
  options: any
) {

  await syncRepository(
    options.product
  );

  const release =
    await createRelease(
      options.product.github_owner,
      options.product.github_repo,
      options.version,
      options.title,
      options.description,
      options.draft,
      options.prerelease
    );

  if (!release.ok) {

    return release;

  }

  await uploadAssets();

  const manifest =
    await createManifest(
      options.version,
      []
    );

  await saveRelease({

    product_id:
      options.product.id,

    version:
      options.version,

    title:
      options.title,

    description:
      options.description,

    published: true,

    status: "Published",

    release_url:
      release.data.html_url,

    github_id:
      release.data.id,

  });

  return {

    success: true,

    release:
      release.data,

    manifest,

  };

}
