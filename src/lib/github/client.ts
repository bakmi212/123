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

  const json =
    await response.json().catch(() => ({}));

  console.log("GitHub Status:", response.status);
  console.log("GitHub Response:", json);

  return {
    ok: response.ok,
    status: response.status,
    data: json,
  };
}
