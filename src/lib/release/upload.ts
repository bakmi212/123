import { githubHeaders } from "./client";

export async function uploadReleaseAsset(
  uploadUrl: string,
  file: File
) {
  const url =
    uploadUrl.split("{")[0] +
    `?name=${encodeURIComponent(file.name)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        githubHeaders().Authorization,

      Accept:
        "application/vnd.github+json",

      "Content-Type":
        file.type ||
        "application/octet-stream",

      "X-GitHub-Api-Version":
        "2022-11-28",
    },

    body: Buffer.from(
      await file.arrayBuffer()
    ),
  });

  const json =
    await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: json,
  };
}

export async function uploadAssets(
  uploadUrl: string,
  files: File[]
) {

  const assets = [];

  for (const file of files) {

    const result =
      await uploadReleaseAsset(
        uploadUrl,
        file
      );

    if (!result.ok) {
      return result;
    }

    assets.push(result.data);

  }

  return {
    success: true,
    assets,
  };

}
