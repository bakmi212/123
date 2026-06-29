const GITHUB_API = "https://api.github.com";

export function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN not configured");
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function githubFetch(
  url: string,
  options: RequestInit = {}
) {
  console.log("================================");
  console.log("GitHub URL:", `${GITHUB_API}${url}`);
  console.log("Method:", options.method);
  console.log("Body:", options.body);
  console.log("================================");

  const response = await fetch(
    `${GITHUB_API}${url}`,
    {
      ...options,
      headers: {
        ...githubHeaders(),
        ...(options.headers ?? {}),
      },
    }
  );

  const json = await response.json().catch(() => ({}));

  console.log("GitHub Status:", response.status);
  console.log("GitHub Response:", json);

  return {
    ok: response.ok,
    status: response.status,
    data: json,
  };
}
