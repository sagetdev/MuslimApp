// src/hooks/useQuranPreloader.ts
import { useEffect, useState } from "react";
import {
  subscribe,
  getStatus,
  start,
  setPriorityPage,
  setWifiOnly,
  pause,
  resume,
  type PreloaderStatus,
} from "../lib/quranPreloader";

export function useQuranPreloader(autoStart = true, priorityPage = 1) {
  const [status, setStatus] = useState<PreloaderStatus>(getStatus());

  useEffect(() => {
    const unsub = subscribe(setStatus);
    if (autoStart) {
      void start(priorityPage, true);
    }
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    setPriorityPage,
    setWifiOnly,
    pause,
    resume,
  };
}