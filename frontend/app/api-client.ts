const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Custom fetch wrapper that automatically handles the backend base URL,
 * headers, and HTTP-only session cookies.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;

  // Merge headers, adding Content-Type JSON if not specified and body is present
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Crucial: enables sending/receiving HTTP-only cookies
  };

  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    let errorMessage = "An error occurred.";
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
    } catch {
      // Fallback if not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
