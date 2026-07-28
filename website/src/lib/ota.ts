import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  digest?: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name?: string;
  published_at?: string;
  prerelease?: boolean;
  assets: ReleaseAsset[];
}

export function parseSemVer(version: string) {
  const clean = version.trim().replace(/^v/, '');
  const parts = clean.split('.');
  const major = parseInt(parts[0] || '0', 10);
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  return {
    major: isNaN(major) ? 0 : major,
    minor: isNaN(minor) ? 0 : minor,
    patch: isNaN(patch) ? 0 : patch,
    clean
  };
}

export function isNewer(v1: string, v2: string): boolean {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);
  if (p1.major !== p2.major) {
    return p1.major > p2.major;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor > p2.minor;
  }
  return p1.patch > p2.patch;
}

let cachedReleases: GitHubRelease[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchReleases(): Promise<GitHubRelease[]> {
  const now = Date.now();
  if (cachedReleases && now < cacheExpiry) {
    return cachedReleases;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Capgo-OTA-Update-Server',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch('https://api.github.com/repos/iitsldev/iit-calendar/releases', {
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`GitHub API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const releases: GitHubRelease[] = await response.json();
  cachedReleases = releases;
  cacheExpiry = now + CACHE_TTL;
  return releases;
}

// In-memory cache for download bundles
const memoryZipCache = new Map<string, { buffer: Buffer; contentType: string; sha256: string }>();

export async function getZipBundle(version: string): Promise<{ buffer: Buffer; contentType: string; sha256: string }> {
  const cleanVersion = parseSemVer(version).clean;

  // 1. Check in-memory cache
  if (memoryZipCache.has(cleanVersion)) {
    return memoryZipCache.get(cleanVersion)!;
  }

  // 2. Check local disk cache (/tmp)
  const tmpDir = os.tmpdir();
  const cachePath = path.join(tmpDir, `ota-cache-${cleanVersion}.zip`);
  const metaPath = path.join(tmpDir, `ota-cache-${cleanVersion}.json`);

  if (fs.existsSync(cachePath) && fs.existsSync(metaPath)) {
    try {
      const buffer = fs.readFileSync(cachePath);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.sha256) {
        const cached = { 
          buffer, 
          contentType: meta.contentType || 'application/zip',
          sha256: meta.sha256
        };
        memoryZipCache.set(cleanVersion, cached);
        return cached;
      }
    } catch (e) {
      console.error('Error reading cache from disk:', e);
    }
  }

  // 3. Not cached, fetch release asset info from GitHub
  const releases = await fetchReleases();
  const release = releases.find(r => parseSemVer(r.tag_name).clean === cleanVersion);

  if (!release) {
    throw new Error(`Version ${version} not found in GitHub releases`);
  }

  const asset = release.assets.find(a => a.name === 'web-build.zip');
  if (!asset) {
    throw new Error(`No web-build.zip asset found for version ${version}`);
  }

  // 4. Download asset content
  const assetRes = await fetch(asset.browser_download_url, {
    headers: {
      'User-Agent': 'Capgo-OTA-Update-Server',
    }
  });

  if (!assetRes.ok) {
    throw new Error(`Failed to download bundle from GitHub: ${assetRes.statusText}`);
  }

  const arrayBuffer = await assetRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = assetRes.headers.get('content-type') || 'application/zip';

  // Calculate SHA256 of the downloaded buffer
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 5. Cache in disk and memory
  try {
    fs.writeFileSync(cachePath, buffer);
    fs.writeFileSync(metaPath, JSON.stringify({ contentType, sha256 }));
  } catch (e) {
    console.error('Error writing cache to disk:', e);
  }

  const result = { buffer, contentType, sha256 };
  memoryZipCache.set(cleanVersion, result);
  return result;
}

