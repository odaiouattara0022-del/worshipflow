const PP_HOST = process.env.PP_API_HOST || "127.0.0.1";
const PP_PORT = process.env.PP_API_PORT || "1025";

function baseUrl() {
  return `http://${PP_HOST}:${PP_PORT}`;
}

async function ppFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function checkConnection(): Promise<{
  connected: boolean;
  version?: string;
}> {
  try {
    const res = await fetch(`${baseUrl()}/version`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    return {
      connected: true,
      version:
        data?.version ?? data?.name ?? JSON.stringify(data).slice(0, 60),
    };
  } catch {
    return { connected: false };
  }
}

export async function getPlaylists() {
  return ppFetch("/v1/playlists", []);
}

export async function getLibrary() {
  return ppFetch("/v1/libraries", []);
}

export async function activatePlaylist(id: string) {
  return ppFetch(`/v1/playlist/${encodeURIComponent(id)}/focus`, null);
}

export async function triggerSlide(presentationId: string, slideIndex: number) {
  return ppFetch(
    `/v1/presentation/${encodeURIComponent(presentationId)}/${slideIndex}/trigger`,
    null
  );
}
