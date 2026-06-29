import crypto from "crypto";
import fs from "fs";

export async function createManifest(
  version: string,
  files: {
    name: string;
    path: string;
  }[]
) {

  const manifest = {
    version,
    generated_at:
      new Date().toISOString(),
    files: [],
  };

  for (const file of files) {

    const buffer =
      fs.readFileSync(file.path);

    const hash =
      crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

    manifest.files.push({
      name: file.name,
      size: buffer.length,
      sha256: hash,
    });

  }

  return manifest;
}
