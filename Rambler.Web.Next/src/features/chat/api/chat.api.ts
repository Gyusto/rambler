import { http } from "@/lib/api/http";
import type { ListChannel } from "@/types/protocol";

export const chatApi = {
  /** Public rooms with at least one occupant. */
  getRooms: (search = "") =>
    http.get<ListChannel[]>(
      `/chat/getrooms${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
};
