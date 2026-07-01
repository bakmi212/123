import crypto from "crypto";

export interface ManifestFile {
  name: string;
  size: number;
  url?: string;
  sha256?: string;
}

export interface Manifest {
  version: string;
  generated_at: string;
  files: ManifestFile[];
}

export async function createManifest(
  version: string,
  assets: any[]
): Promise<Manifest> {

  return {

    version,

    generated_at: new Date().toISOString(),

    files: assets.map(asset => ({

      name: asset.name,

      size: asset.size,

      url: asset.browser_download_url,

      sha256: asset.digest ?? "",

    })),

  };

}
