// src/lib/quranPreloader.ts
import * as Network from "expo-network";
import { TOTAL_PAGES } from "../data/pageToSurah";
import { apiFetch } from "./api";
import { getCachedPage, getCachedCount } from "./quranCache";
import { isBundleDownloaded } from "./quranBundle";

export type PreloaderStatus = {
  running: boolean;
  cached: number;
  total: number;
  queued: number;
  active: boolean;
  wifiOnly: boolean;
  paused: boolean;
  lastError: string | null;
};

type Listener = (status: PreloaderStatus) => void;

const listeners = new Set<Listener>();

let state: PreloaderStatus = {
  running: false,
  cached: 0,
  total: TOTAL_PAGES,
  queued: 0,
  active: false,
  wifiOnly: true,
  paused: false,
  lastError: null,
};

let queue: number[] = [];
let workers = 0;
const MAX_WORKERS = 4;
let currentPriority = 1;
let aborted = false;

function emit() {
  listeners.forEach((fn) => fn(state));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function getStatus(): PreloaderStatus {
  return state;
}

export function setWifiOnly(value: boolean) {
  state = { ...state, wifiOnly: value };
  emit();
}

export function pause() {
  state = { ...state, paused: true };
  emit();
}

export function resume() {
  state = { ...state, paused: false };
  emit();
  pump();
}

export function stop() {
  aborted = true;
  queue = [];
  state = { ...state, running: false, queued: 0 };
  emit();
}

export function setPriorityPage(page: number) {
  currentPriority = Math.min(TOTAL_PAGES, Math.max(1, page));
  queue.sort(
    (a, b) => Math.abs(a - currentPriority) - Math.abs(b - currentPriority)
  );
  emit();
  pump();
}

async function isWifiConnected(): Promise<boolean> {
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) return false;
    if (state.wifiOnly) {
      return net.type === Network.NetworkStateType.WIFI;
    }
    return true;
  } catch {
    return true;
  }
}

async function processPage(page: number) {
  try {
    // Déjà en cache ? → rien à faire.
    const cached = await getCachedPage(page);
    if (cached) {
      state = { ...state, cached: await getCachedCount() };
      emit();
      return;
    }

    // Réseau OK ?
    if (!(await isWifiConnected())) {
      state = { ...state, paused: true, lastError: "Wi-Fi requis" };
      emit();
      return;
    }

    await apiFetch(`/mushaf/pages/${page}`, { priority: "low" });

    state = { ...state, cached: await getCachedCount(), lastError: null };
    emit();
  } catch (error) {
    state = {
      ...state,
      lastError: error instanceof Error ? error.message : "Erreur inconnue",
    };
    emit();
  }
}

async function worker() {
  while (workers > 0 && queue.length > 0 && !aborted) {
    if (state.paused) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    const page = queue.shift();
    if (page === undefined) break;

    state = { ...state, queued: queue.length, active: true };
    emit();

    await processPage(page);
  }

  workers--;
  if (workers === 0) {
    state = { ...state, active: false, running: false };
    emit();
  }
}

function pump() {
  if (aborted) return;
  if (state.paused) return;

  while (workers < MAX_WORKERS && queue.length > 0) {
    workers++;
    void worker();
  }
}

export async function start(priorityPage = 1, wifiOnly = true) {
  if (state.running) return;

  // 👇 Si le bundle complet est déjà téléchargé, rien à précharger.
  if (await isBundleDownloaded()) {
    state = {
      ...state,
      running: false,
      cached: await getCachedCount(),
      queued: 0,
      active: false,
      lastError: null,
    };
    emit();
    return;
  }

  aborted = false;
  currentPriority = priorityPage;

  state = {
    ...state,
    running: true,
    wifiOnly,
    paused: false,
    cached: await getCachedCount(),
    lastError: null,
  };
  emit();

  // Construire la file : pages triées par distance à la priorité
  queue = [];
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    queue.push(p);
  }
  queue.sort(
    (a, b) => Math.abs(a - currentPriority) - Math.abs(b - currentPriority)
  );

  state = { ...state, queued: queue.length };
  emit();

  pump();
}