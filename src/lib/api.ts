const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:5001"
    : "https://stagingapi.realproxy.net");

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("adminToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      res = await fetch(`http://127.0.0.1:5001${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      throw err;
    }
  }

  // If remote returned 404 and running locally on dev, fallback to local API (http://127.0.0.1:5001)
  if (
    res.status === 404 &&
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    !API_URL.includes("127.0.0.1") &&
    !API_URL.includes("localhost")
  ) {
    try {
      const localRes = await fetch(`http://127.0.0.1:5001${endpoint}`, {
        ...options,
        headers,
      });
      if (localRes.ok) {
        return localRes;
      }
    } catch {
      // Ignore and keep original response
    }
  }

  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    window.location.href = "/signin";
    throw new Error("Session expired");
  }

  return res;
}

export { apiFetch, API_URL };
