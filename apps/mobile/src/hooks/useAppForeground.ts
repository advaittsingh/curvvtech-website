import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** True when app is active (foreground). Pause polling when backgrounded. */
export function useAppForeground(): boolean {
  const [foreground, setForeground] = useState(() => AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      setForeground(next === "active");
    });
    return () => sub.remove();
  }, []);

  return foreground;
}
