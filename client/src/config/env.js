const env = import.meta.env

export const config = {
  backendUrl: env.VITE_BACKEND_URL || "",
  apiBase: env.VITE_BACKEND_URL ? `${env.VITE_BACKEND_URL}/api` : "/api",
  port: Number(env.VITE_PORT) || 5180,
  isDev: env.MODE === "development",
  isProd: env.MODE === "production",
}
