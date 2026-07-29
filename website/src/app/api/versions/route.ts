import { NextRequest, NextResponse } from 'next/server';
import { fetchReleases, parseSemVer, isNewer, compareSemVer } from '@/lib/ota';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterMajor = searchParams.get('major');
    const filterMinor = searchParams.get('minor');

    const releases = await fetchReleases();

    const versions = releases
      .map(release => {
        const parsedRel = parseSemVer(release.tag_name);
        const asset = release.assets.find(a => a.name === 'web-build.zip');
        return {
          version: parsedRel.clean,
          name: release.name || release.tag_name,
          tag_name: release.tag_name,
          published_at: (release as any).published_at || '',
          has_bundle: !!asset,
          parsedRel
        };
      })
      // Only include releases that have the web-build.zip bundle attached
      .filter(v => v.has_bundle)
      // Optionally filter by major or minor versions if query parameters are provided
      .filter(v => {
        if (filterMajor !== null && v.parsedRel.major !== parseInt(filterMajor, 10)) {
          return false;
        }
        if (filterMinor !== null && v.parsedRel.minor !== parseInt(filterMinor, 10)) {
          return false;
        }
        return true;
      });

    // Sort versions descending (newest first)
    versions.sort((a, b) => compareSemVer(b.version, a.version));

    const baseUrl = request.nextUrl.origin;
    const responseData = versions.map(v => ({
      version: v.version,
      name: v.name,
      tag_name: v.tag_name,
      published_at: v.published_at,
      download_url: `${baseUrl}/api/download?version=${v.version}`
    }));

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      }
    });
  } catch (error: any) {
    console.error('Versions API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
