import { useEffect, useRef } from "react";
import ReceiveSharingIntent from "react-native-receive-sharing-intent";
import { appStorage } from "../storage/appStorage";

type SharedFile = {
  text?: string;
  weblink?: string;
};

/**
 * Stores shared text for Home to open Add chat when the main app is ready.
 * Requires a dev build (`expo prebuild`); not available in Expo Go.
 */
export function ShareIntentBootstrap() {
  const lastHandled = useRef<string | null>(null);
  const lastAt = useRef(0);

  useEffect(() => {
    ReceiveSharingIntent.getReceivedFiles(
      (files: SharedFile[]) => {
        if (!files?.length) return;
        const item = files[0];
        const text = String(item.text ?? item.weblink ?? "").trim();
        if (!text) return;
        const now = Date.now();
        if (text === lastHandled.current && now - lastAt.current < 2500) return;
        lastHandled.current = text;
        lastAt.current = now;
        void appStorage.setPendingSharedText(text);
      },
      () => {},
      "ShareText"
    );
  }, []);

  return null;
}
