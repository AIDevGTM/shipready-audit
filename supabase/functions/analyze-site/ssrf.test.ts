import { describe, it, expect } from "vitest";
import {
  BlockedUrlError,
  assertPublicUrl,
  isBlockedHostname,
  isPrivateIp,
  safeFetch,
  type ResolveHost,
} from "./ssrf.ts";

const PUBLIC_IP = "93.184.216.34";

/** A resolveHost stub that maps everything to a public address unless overridden. */
function resolver(overrides: Record<string, string[]> = {}): ResolveHost {
  return async (hostname) => overrides[hostname] ?? [PUBLIC_IP];
}

interface Route {
  status: number;
  location?: string;
  body?: string;
}

/** A fetch stub that records every URL it is asked to fetch. */
function routeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    const location = route.location;
    const response = {
      status: route.status,
      ok: route.status >= 200 && route.status < 300,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "location" ? location ?? null : null,
      },
      text: async () => route.body ?? "",
    };
    return response as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl: impl, calls };
}

describe("isPrivateIp", () => {
  const blocked = [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:169.254.169.254",
    "64:ff9b::a00:1",
  ];
  const allowed = [
    "8.8.8.8",
    "93.184.216.34",
    "172.32.0.1",
    "172.15.0.1",
    "2606:4700:4700::1111",
  ];

  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      expect(isPrivateIp(ip)).toBe(true);
    });
  }
  for (const ip of allowed) {
    it(`allows ${ip}`, () => {
      expect(isPrivateIp(ip)).toBe(false);
    });
  }
});

describe("isBlockedHostname", () => {
  it("blocks literal private IPs and internal names", () => {
    for (const host of [
      "localhost",
      "127.0.0.1",
      "169.254.169.254",
      "metadata.google.internal",
      "metadata",
      "db.local",
      "service.internal",
    ]) {
      expect(isBlockedHostname(host)).toBe(true);
    }
  });

  it("allows ordinary public names", () => {
    for (const host of ["example.com", "ship-ready.xyz", "fda.gov", "api.firecrawl.dev"]) {
      expect(isBlockedHostname(host)).toBe(false);
    }
  });
});

describe("assertPublicUrl", () => {
  it("refuses a hostname that resolves to a private address", async () => {
    await expect(
      assertPublicUrl("https://internal.example/", undefined, resolver({ "internal.example": ["10.0.0.5"] })),
    ).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it("refuses non-http protocols", async () => {
    await expect(assertPublicUrl("ftp://example.com/", undefined, resolver())).rejects.toBeInstanceOf(
      BlockedUrlError,
    );
  });
});

describe("safeFetch redirect handling", () => {
  it("refuses a redirect to a cloud-metadata address without fetching it", async () => {
    const { fetchImpl, calls } = routeFetch({
      "https://public.example/": {
        status: 302,
        location: "http://169.254.169.254/latest/meta-data/",
      },
    });

    await expect(
      safeFetch("https://public.example/", { resolveHost: resolver(), fetchImpl }),
    ).rejects.toBeInstanceOf(BlockedUrlError);

    // The internal target must never be requested.
    expect(calls).toEqual(["https://public.example/"]);
  });

  it("refuses a redirect to an internal DNS name", async () => {
    const { fetchImpl, calls } = routeFetch({
      "https://public.example/": {
        status: 301,
        location: "https://metadata.google.internal/computeMetadata/v1/",
      },
    });

    await expect(
      safeFetch("https://public.example/", { resolveHost: resolver(), fetchImpl }),
    ).rejects.toBeInstanceOf(BlockedUrlError);
    expect(calls).toEqual(["https://public.example/"]);
  });

  it("refuses a redirect to a public name that resolves internally", async () => {
    const { fetchImpl, calls } = routeFetch({
      "https://public.example/": { status: 302, location: "https://lb.internal.example/" },
    });

    await expect(
      safeFetch("https://public.example/", {
        resolveHost: resolver({ "lb.internal.example": ["192.168.0.10"] }),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(BlockedUrlError);
    expect(calls).toEqual(["https://public.example/"]);
  });

  it("follows a redirect between public addresses to its final response", async () => {
    const { fetchImpl, calls } = routeFetch({
      "https://public.example/": { status: 302, location: "https://cdn.example/page" },
      "https://cdn.example/page": { status: 200, body: "<h1>hi</h1>" },
    });

    const response = await safeFetch("https://public.example/", { resolveHost: resolver(), fetchImpl });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<h1>hi</h1>");
    expect(calls).toEqual(["https://public.example/", "https://cdn.example/page"]);
  });

  it("caps the redirect chain", async () => {
    const routes: Record<string, Route> = {};
    for (let i = 0; i < 12; i++) {
      routes[`https://hop${i}.example/`] = { status: 302, location: `https://hop${i + 1}.example/` };
    }
    const { fetchImpl } = routeFetch(routes);

    await expect(
      safeFetch("https://hop0.example/", { resolveHost: resolver(), fetchImpl }),
    ).rejects.toBeInstanceOf(BlockedUrlError);
  });
});
