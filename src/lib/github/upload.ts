import { githubHeaders } from "./client";

export async function uploadReleaseAsset(
  uploadUrl: string,
  file: File
) {
  const url =
    `${uploadUrl.split("{")[0]}?name=${encodeURIComponent(file.name)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: githubHeaders().Authorization,
      Accept: "application/vnd.github+json",
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

  const json = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: json,
  };
}
