const APIBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${APIBaseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${APIBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
