import type { NextConfig } from 'next';

/**
 * Uploaded files (book covers, QRIS codes, avatars, payment proofs) are served
 * by the Express API under /uploads, so every API origin this app may point at
 * has to be whitelisted for next/image — otherwise the optimizer answers 400
 * and every uploaded image disappears in production.
 *
 * NEXT_PUBLIC_API_URL is inlined at build time, which is what we want here:
 * remotePatterns is baked into the build as well. API_URL is accepted as a
 * fallback for builds that only define the server-side variable. localhost:5000
 * (the dev API) is always allowed so `next dev` needs no configuration.
 */
const DEV_API_ORIGIN = 'http://localhost:5000';

interface UploadPattern {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname: string;
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function uploadRemotePatterns(): UploadPattern[] {
  const origins = new Set<string>([DEV_API_ORIGIN]);

  for (const candidate of [process.env.NEXT_PUBLIC_API_URL, process.env.API_URL]) {
    const parsed = parseOrigin(candidate);
    if (parsed) origins.add(parsed.origin);
  }

  return [...origins].map((origin) => {
    const url = new URL(origin);
    return {
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: '/uploads/**',
    };
  });
}

const nextConfig: NextConfig = {
  // Emits .next/standalone so the container image only needs node + server.js.
  output: 'standalone',
  // Pin the tracing root to this app. Without it, Next walks up and finds the
  // backend's package-lock.json, which nests the output under
  // .next/standalone/frontend/ locally but not inside a Docker build context —
  // one deterministic flat layout is what the Dockerfile expects.
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: uploadRemotePatterns(),
  },
};

export default nextConfig;
