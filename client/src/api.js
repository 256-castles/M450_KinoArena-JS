// Fetch-Wrapper fuer die JSON-API unter /api.

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.alert ?? body?.error ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body ?? {};
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {
    Accept: "application/json",
    // CSRF-Schutz: der Server akzeptiert schreibende Anfragen nur mit diesem Header
    "X-Requested-With": "XMLHttpRequest"
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

// ?seat_ids=1&seat_ids=2
export function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null && item !== "") search.append(key, item);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
