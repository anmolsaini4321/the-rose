// Validate required environment variables at startup
// This should be imported early in the application lifecycle

const REQUIRED_CLIENT_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

const REQUIRED_SERVER_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

type ClientEnv = Record<(typeof REQUIRED_CLIENT_VARS)[number], string>;
type ServerEnv = Record<(typeof REQUIRED_SERVER_VARS)[number], string>;

export function validateClientEnv(): void {
  const missing: string[] = [];

  REQUIRED_CLIENT_VARS.forEach((key) => {
    const value = import.meta.env[key];
    if (!value) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error("[Environment] Missing required client-side variables:", missing.join(", "));
    console.error("[Environment] Critical dependencies missing. Application cannot start.");

    if (typeof window !== "undefined") {
      const errorDiv = document.createElement("div");
      errorDiv.innerHTML = `
        <div style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #c53030; font-size: 24px; margin-top: 0; font-weight: 600;">Configuration Error</h1>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">The application is missing critical environment variables:</p>
          <ul style="background: #fff; padding: 15px 30px; border-radius: 4px; border: 1px solid #fed7d7; list-style-type: disc; margin: 15px 0;">
            ${missing.map((v) => `<li style="color: #2d3748; font-family: monospace; font-size: 14px; margin-bottom: 5px;"><code>${v}</code></li>`).join("")}
          </ul>
          <p style="color: #718096; font-size: 14px; margin-top: 20px;">Please contact support@therose.com or check your local <code>.env</code> file configuration.</p>
        </div>
      `;
      document.body.appendChild(errorDiv);
    }

    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function validateServerEnv(env: Record<string, string | undefined>): void {
  const missing: string[] = [];

  REQUIRED_SERVER_VARS.forEach((key) => {
    if (!env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error("[Environment] Missing required server-side variables:", missing.join(", "));
    console.error("[Environment] Server operations may fail.");
  }
}

export function getClientEnv(): ClientEnv {
  const env = {} as ClientEnv;

  REQUIRED_CLIENT_VARS.forEach((key) => {
    const value = import.meta.env[key];
    if (value) {
      env[key] = value;
    }
  });

  return env;
}

export function getServerEnv(env: Record<string, string | undefined>): ServerEnv {
  const serverEnv = {} as ServerEnv;

  REQUIRED_SERVER_VARS.forEach((key) => {
    const value = env[key];
    if (value) {
      serverEnv[key] = value;
    }
  });

  return serverEnv;
}
