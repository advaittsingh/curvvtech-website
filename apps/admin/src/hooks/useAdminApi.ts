import { useMemo } from "react";
import { adminApi } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function useAdminApi() {
  return useMemo(() => adminApi(getAccessToken()), []);
}
