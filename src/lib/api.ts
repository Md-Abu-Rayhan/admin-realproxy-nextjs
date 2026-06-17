const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("adminToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    window.location.href = "/signin";
    throw new Error("Session expired");
  }

  return res;
}

export { apiFetch, API_URL };
