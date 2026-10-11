// src/lib/concurrency.ts

export type Priority = "high" | "normal" | "low";

/**
 * Sémaphore avec priorités.
 * - Limite le nombre total de tâches concurrentes.
 * - Les tâches "high" passent toujours avant "normal", qui passent avant "low".
 */
class PrioritySemaphore {
  private max: number;
  private running = 0;
  private queues: Record<Priority, (() => void)[]> = {
    high: [],
    normal: [],
    low: [],
  };

  constructor(max: number) {
    this.max = max;
  }

  async acquire(priority: Priority = "normal"): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queues[priority].push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next =
      this.queues.high.shift() ??
      this.queues.normal.shift() ??
      this.queues.low.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  get stats() {
    return {
      running: this.running,
      queued:
        this.queues.high.length +
        this.queues.normal.length +
        this.queues.low.length,
    };
  }
}

/**
 * Sémaphore global HTTP. 6 requêtes en vol maximum.
 * Les requêtes "high" (lecture utilisateur) passent devant "low" (préchargement).
 */
export const httpSemaphore = new PrioritySemaphore(6);