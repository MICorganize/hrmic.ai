/**
 * Keep server registration free of network I/O. Next.js waits for this hook
 * before an instance can accept traffic, so connecting to Neon or Redis here
 * turns an optional cache warm-up into user-visible cold-start latency.
 */
export function register() {
  if (process.env.PERFORMANCE_LOGGING === "true") {
    console.info(JSON.stringify({ event: "server.instance_ready", runtime: process.env.NEXT_RUNTIME ?? "unknown" }));
  }
}
