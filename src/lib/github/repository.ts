import { githubFetch } from "./client";

export async function createRepository(
  name: string
) {

  const repo = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return githubFetch(
    "/user/repos",
    {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        private: true,
        auto_init: true,
        has_issues: true,
        has_projects: false,
        has_wiki: false,
      }),
    }
  );
}
