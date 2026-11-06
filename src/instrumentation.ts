import type { Instrumentation } from "next";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info(JSON.stringify({
      event: "application_started",
      service: "syspro-erp-reports",
      timestamp: new Date().toISOString(),
    }));
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest)
    : undefined;
  console.error(JSON.stringify({
    event: "request_error",
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    routeType: context.routeType,
    digest,
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  }));
};
