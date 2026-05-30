import { NextRequest, NextResponse } from "next/server";
import { getDeviceBaseUrl } from "@/lib/propresenter/device-url";

/**
 * POST /api/propresenter/control
 * Body: { action, deviceId?, ...params }
 *
 * Proxies control commands to ProPresenter's REST API.
 *
 * Supported actions:
 * - next              → GET /v1/trigger/next
 * - previous          → GET /v1/trigger/previous
 * - trigger           → GET /v1/trigger/{id}/{index}   (trigger specific slide)
 * - triggerPlaylist    → GET /v1/playlist/{id}/trigger  (trigger playlist item)
 * - clear             → GET /v1/clear/layer/{layer}
 * - clearAll          → GET /v1/clear
 * - status            → GET /v1/status/slide  (current slide info)
 * - activePresentation → GET /v1/presentation/active
 * - focusedPresentation → GET /v1/presentation/focused
 * - playlists         → GET /v1/playlists
 * - playlistItems     → GET /v1/playlist/{id}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, deviceId, ...params } = body;

    if (!action) {
      return NextResponse.json({ error: "action requis" }, { status: 400 });
    }

    const baseUrl = await getDeviceBaseUrl(deviceId);
    const timeout = AbortSignal.timeout(5000);

    let url: string;
    let method = "GET";

    switch (action) {
      case "next":
        url = `${baseUrl}/v1/trigger/next`;
        break;
      case "previous":
        url = `${baseUrl}/v1/trigger/previous`;
        break;
      case "trigger":
        if (!params.id) {
          return NextResponse.json({ error: "id requis pour trigger" }, { status: 400 });
        }
        url = params.index !== undefined
          ? `${baseUrl}/v1/trigger/${params.id}/${params.index}`
          : `${baseUrl}/v1/trigger/${params.id}`;
        break;
      case "triggerPlaylist":
        if (!params.id) {
          return NextResponse.json({ error: "id requis pour triggerPlaylist" }, { status: 400 });
        }
        url = params.index !== undefined
          ? `${baseUrl}/v1/playlist/${params.id}/${params.index}/trigger`
          : `${baseUrl}/v1/playlist/${params.id}/trigger`;
        break;
      case "clear":
        url = `${baseUrl}/v1/clear/layer/${params.layer || "presentation"}`;
        break;
      case "clearAll":
        url = `${baseUrl}/v1/clear`;
        break;
      case "status":
        url = `${baseUrl}/v1/status/slide`;
        break;
      case "activePresentation":
        url = `${baseUrl}/v1/presentation/active`;
        break;
      case "focusedPresentation":
        url = `${baseUrl}/v1/presentation/focused`;
        break;
      case "playlists":
        url = `${baseUrl}/v1/playlists`;
        break;
      case "playlistItems":
        if (!params.id) {
          return NextResponse.json({ error: "id requis pour playlistItems" }, { status: 400 });
        }
        url = `${baseUrl}/v1/playlist/${params.id}`;
        break;
      case "thumbnail": {
        // GET /v1/presentation/{id}/thumbnail/{index}
        if (!params.id) {
          return NextResponse.json({ error: "id requis pour thumbnail" }, { status: 400 });
        }
        const idx = params.index ?? 0;
        url = `${baseUrl}/v1/presentation/${params.id}/thumbnail/${idx}`;
        const thumbRes = await fetch(url, { signal: timeout });
        if (!thumbRes.ok) {
          return NextResponse.json({ error: "Thumbnail non disponible" }, { status: thumbRes.status });
        }
        const imgBuf = await thumbRes.arrayBuffer();
        return new NextResponse(imgBuf, {
          headers: {
            "Content-Type": thumbRes.headers.get("Content-Type") || "image/jpeg",
            "Cache-Control": "public, max-age=60",
          },
        });
      }
      default:
        return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 });
    }

    const res = await fetch(url, { method, signal: timeout });

    // Some PP endpoints return 204 (no content)
    if (res.status === 204) {
      return NextResponse.json({ success: true });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `ProPresenter a retourné ${res.status}` },
        { status: res.status }
      );
    }

    // Try to parse JSON, fallback to text
    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("json")) {
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    const text = await res.text();
    return NextResponse.json({ success: true, data: text || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
