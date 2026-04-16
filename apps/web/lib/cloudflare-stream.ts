const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function getCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Credenciales de Cloudflare Stream no configuradas");
  }
  return { accountId, apiToken };
}

/** Create a direct creator upload URL via Cloudflare Stream Direct Upload */
export async function createDirectUploadUrl(meta?: Record<string, string>) {
  const { accountId, apiToken } = getCredentials();

  const body: Record<string, unknown> = {
    maxDurationSeconds: 21600, // 6 hours max
    requireSignedURLs: false,
  };

  if (meta) {
    body.meta = meta;
  }

  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare Stream error: ${text}`);
  }

  const data = await res.json();
  return {
    uploadUrl: data.result.uploadURL as string,
    uid: data.result.uid as string,
  };
}

/** Get video details and status */
export async function getVideoDetails(uid: string) {
  const { accountId, apiToken } = getCredentials();

  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream/${uid}`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.result as {
    uid: string;
    status: { state: string; pctComplete?: string };
    duration: number;
    thumbnail: string;
    playback: { hls: string; dash: string };
    readyToStream: boolean;
  };
}

/** Get the iframe embed URL for a video */
export function getPlayerUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`;
}
