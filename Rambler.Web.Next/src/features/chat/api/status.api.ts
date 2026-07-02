import { http } from "@/lib/api/http";

/** Public server stats (AllowAnonymous on the backend). */
export const statusApi = {
  /** users currently connected/online. */
  activeUsers: () => http.get<number>("/status/getactiveusercount"),
  /** total registered users. */
  totalUsers: () => http.get<number>("/status/getusercount"),
};
