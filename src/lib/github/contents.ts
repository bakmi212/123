import { githubFetch } from "./client";

function encode(content: string) {
  return Buffer.from(content).toString("base64");
}

async function getFileSha(
  owner: string,
  repo: string,
  path: string
) {
  const result = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`
  );

  if (!result.ok) {
    return null;
  }

  return result.data.sha ?? null;
}

async function upsertFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
) {
  const sha = await getFileSha(
    owner,
    repo,
    path
  );

  return githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: encode(content),
        sha: sha ?? undefined,
      }),
    }
  );
}

export async function syncRepository(
  product: {
    github_owner: string;
    github_repo: string;
    name: string;
    version?: string;
    platform?: string;
  }
) {

  await upsertFile(
    product.github_owner,
    product.github_repo,
    "README.md",
`# ${product.name}

Repository managed by LumintuSuite.

⚠ Auto Generated.
`,
    "Update README"
  );

  await upsertFile(
    product.github_owner,
    product.github_repo,
    "CHANGELOG.md",
`# Changelog

## ${product.version ?? "1.0.0"}

Initial Release
`,
    "Update CHANGELOG"
  );

  await upsertFile(
    product.github_owner,
    product.github_repo,
    "lumintu.json",
JSON.stringify(
{
  product: product.name,
  version:
    product.version ??
    "1.0.0",
  platform:
    product.platform ??
    "desktop",
  created_by:
    "LumintuSuite",
},
null,
2
),
    "Update Config"
  );

  return {
    success: true,
  };
}
