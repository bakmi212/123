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

  console.log("===== CREATE RELEASE =====");
  console.log("Owner =", owner);
  console.log("Repo  =", repo);

  const result = await githubFetch(
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

  console.log(result);

  return result;
}
