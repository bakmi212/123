import { githubFetch } from "./client";

export async function createRelease(
  owner: string,
  repo: string,
  version: string,
  title: string,
  description: string,
  draft = false,
  prerelease = false
) {

  return githubFetch(
    `/repos/${owner}/${repo}/releases`,
    {
      method: "POST",
      body: JSON.stringify({
        tag_name: version,
        target_commitish: "main",
        name: title,
        body: description,
        draft,
        prerelease,
      }),
    }
  );

}

export async function getLatestRelease(
  owner: string,
  repo: string
) {

  return githubFetch(
    `/repos/${owner}/${repo}/releases/latest`
  );

}

export async function deleteRelease(
  owner: string,
  repo: string,
  releaseId: number
) {

  return githubFetch(
    `/repos/${owner}/${repo}/releases/${releaseId}`,
    {
      method: "DELETE",
    }
  );

}
