import { getToken } from "@/features/chat/state/chat-store";
import { env } from "@/lib/config/env";

export interface UploadResult {
  url: string;
  name: string;
  contentType: string;
}

/**
 * File upload against the .NET MediaController (stores in MinIO, returns a
 * public URL + name). Uses raw fetch so the browser sets the multipart
 * boundary; the chat token is passed so guests can upload too.
 */
export const mediaApi = {
  upload: async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(
      `${env.apiBase}/media/upload?token=${encodeURIComponent(getToken())}`,
      { method: "POST", body: form, credentials: "include" },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Upload failed (${res.status})`);
    }

    const data = (await res.json()) as { Url: string; Name: string; ContentType: string };
    return { url: data.Url, name: data.Name, contentType: data.ContentType };
  },
};
