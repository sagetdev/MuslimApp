// src/hooks/useQuranBundle.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadBundle,
  deleteBundle,
  isBundleDownloaded,
  getLocalBundleVersion,
  checkForUpdates,
  type BundleProgress,
} from "../lib/quranBundle";

type State = {
  downloaded: boolean;
  version: number | null;
  downloading: boolean;
  progress: BundleProgress | null;
  error: string | null;
  pages: number;
  durationMs: number | null;
  hasUpdate: boolean;
};

const INITIAL: State = {
  downloaded: false,
  version: null,
  downloading: false,
  progress: null,
  error: null,
  pages: 0,
  durationMs: null,
  hasUpdate: false,
};

export function useQuranBundle() {
  const [state, setState] = useState<State>(INITIAL);
  const bootstrapped = useRef(false);

  // Vérifie au montage : téléchargé ? version ?
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      const [downloaded, version] = await Promise.all([
        isBundleDownloaded(),
        getLocalBundleVersion(),
      ]);
      setState((s) => ({ ...s, downloaded, version }));

      if (downloaded) {
        const check = await checkForUpdates();
        setState((s) => ({ ...s, hasUpdate: check.needsUpdate }));
      }
    })();
  }, []);

  const download = useCallback(async () => {
    setState((s) => ({
      ...s,
      downloading: true,
      progress: null,
      error: null,
    }));

    try {
      const result = await downloadBundle((progress) => {
        setState((s) => ({ ...s, progress }));
      });

      setState({
        downloaded: true,
        version: result.version,
        downloading: false,
        progress: null,
        error: null,
        pages: result.pages,
        durationMs: result.durationMs,
        hasUpdate: false,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        downloading: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }));
    }
  }, []);

  const remove = useCallback(async () => {
    await deleteBundle();
    setState(INITIAL);
  }, []);

  return { state, download, remove };
}