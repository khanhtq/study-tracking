import { presenceApi } from '../api';

const STORAGE_KEY = 'pending_presence_checks';

export class PresenceBatchService {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.queue = [];
    this.timerId = null;
    this.flushIntervalMs = 120000; // 2 minutes (120 seconds)

    this.loadFromStorage();
    this.startAutoFlush();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length > 0) {
          this.queue.push(...stored);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Could not parse pending presence checks from localStorage:', e);
    }
  }

  saveToStorage() {
    try {
      if (this.queue.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not save pending presence checks to localStorage:', e);
    }
  }

  addCheck(check) {
    if (!this.sessionId) return;
    this.queue.push({
      present: Boolean(check.present),
      timestamp: check.timestamp || new Date().toISOString(),
    });
  }

  startAutoFlush() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  async flush() {
    if (!this.sessionId || this.queue.length === 0) return;

    const batchToSend = [...this.queue];
    this.queue = [];

    try {
      await presenceApi.sendBatch({
        sessionId: this.sessionId,
        checks: batchToSend,
      });
      // Clear backup if request succeeded
      this.saveToStorage();
    } catch (err) {
      console.warn('Failed to send presence batch HTTP request. Retrying later:', err);
      // Restore failed checks to queue and save to localStorage
      this.queue = [...batchToSend, ...this.queue];
      this.saveToStorage();
    }
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // Final flush on session stop
    this.flush().finally(() => {
      this.saveToStorage();
    });
  }
}
