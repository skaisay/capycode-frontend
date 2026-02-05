/**
 * Resilient Database Service
 * Отказоустойчивый сервис БД с кэшированием и fallback
 */

interface DatabaseProvider {
  name: string;
  type: 'supabase' | 'neon' | 'planetscale' | 'turso';
  url: string;
  isHealthy: boolean;
  lastCheck: number;
  failCount: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ResilientDatabaseService {
  private providers: DatabaseProvider[] = [];
  private currentProvider: DatabaseProvider | null = null;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private offlineQueue: Array<{ operation: string; data: any; timestamp: number }> = [];
  
  private readonly MAX_FAIL_COUNT = 3;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 минут
  private readonly CACHE_KEY = 'db_provider_state';
  private readonly OFFLINE_QUEUE_KEY = 'db_offline_queue';

  constructor() {
    this.initProviders();
    this.loadState();
    this.loadOfflineQueue();
    
    // Слушаем онлайн/офлайн события
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processOfflineQueue());
      window.addEventListener('offline', () => console.log('[ResilientDB] Went offline'));
    }
  }

  private initProviders() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    this.providers = [];
    
    if (supabaseUrl) {
      this.providers.push({
        name: 'Supabase Primary',
        type: 'supabase',
        url: supabaseUrl.replace(/[\r\n]/g, ''),
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
      });
    }

    // Можно добавить резервные БД
    const backupUrl = process.env.NEXT_PUBLIC_SUPABASE_BACKUP_URL;
    if (backupUrl) {
      this.providers.push({
        name: 'Supabase Backup',
        type: 'supabase',
        url: backupUrl,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
      });
    }

    // Neon как резерв (если настроен)
    const neonUrl = process.env.NEXT_PUBLIC_NEON_URL;
    if (neonUrl) {
      this.providers.push({
        name: 'Neon',
        type: 'neon',
        url: neonUrl,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
      });
    }

    this.currentProvider = this.providers[0] || null;
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.CACHE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        state.providers?.forEach((savedProvider: Partial<DatabaseProvider>) => {
          const provider = this.providers.find(p => p.name === savedProvider.name);
          if (provider) {
            provider.isHealthy = savedProvider.isHealthy ?? true;
            provider.failCount = savedProvider.failCount ?? 0;
          }
        });
      }
    } catch (e) {
      console.warn('[ResilientDB] Failed to load state:', e);
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    
    try {
      const state = {
        providers: this.providers.map(p => ({
          name: p.name,
          isHealthy: p.isHealthy,
          failCount: p.failCount,
        })),
        currentProvider: this.currentProvider?.name,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[ResilientDB] Failed to save state:', e);
    }
  }

  private loadOfflineQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[ResilientDB] Failed to load offline queue:', e);
    }
  }

  private saveOfflineQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (e) {
      console.warn('[ResilientDB] Failed to save offline queue:', e);
    }
  }

  /**
   * Кэширование данных
   */
  public setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    // Также сохраняем в localStorage для персистентности
    if (typeof window !== 'undefined') {
      try {
        const cacheData = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        localStorage.setItem(`db_cache_${key}`, JSON.stringify(cacheData));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Получить данные из кэша
   */
  public getCache<T>(key: string): T | null {
    // Сначала проверяем память
    const memoryCache = this.cache.get(key);
    if (memoryCache) {
      if (Date.now() - memoryCache.timestamp < memoryCache.ttl) {
        return memoryCache.data as T;
      }
      this.cache.delete(key);
    }
    
    // Затем localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`db_cache_${key}`);
        if (saved) {
          const cacheData = JSON.parse(saved);
          if (Date.now() - cacheData.timestamp < cacheData.ttl) {
            // Восстанавливаем в память
            this.cache.set(key, cacheData);
            return cacheData.data as T;
          }
          localStorage.removeItem(`db_cache_${key}`);
        }
      } catch (e) {
        // Ignore
      }
    }
    
    return null;
  }

  /**
   * Инвалидировать кэш
   */
  public invalidateCache(keyPattern?: string) {
    if (keyPattern) {
      // Удаляем по паттерну
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.includes(keyPattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`db_cache_${key}`);
        }
      });
    } else {
      // Удаляем всё
      this.cache.clear();
      if (typeof window !== 'undefined') {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith('db_cache_')) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  }

  /**
   * Добавить операцию в офлайн очередь
   */
  public queueOfflineOperation(operation: string, data: any) {
    this.offlineQueue.push({
      operation,
      data,
      timestamp: Date.now(),
    });
    this.saveOfflineQueue();
    console.log(`[ResilientDB] Queued offline operation: ${operation}`);
  }

  /**
   * Обработать офлайн очередь когда вернулись онлайн
   */
  public async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`[ResilientDB] Processing ${this.offlineQueue.length} queued operations...`);
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();
    
    for (const item of queue) {
      try {
        // Здесь нужно обработать каждую операцию
        // Это зависит от конкретной реализации
        console.log(`[ResilientDB] Processing: ${item.operation}`);
        // await this.executeOperation(item.operation, item.data);
      } catch (error) {
        console.error(`[ResilientDB] Failed to process queued operation:`, error);
        // Возвращаем в очередь если не удалось
        this.offlineQueue.push(item);
      }
    }
    
    this.saveOfflineQueue();
  }

  /**
   * Проверить онлайн ли мы
   */
  public isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Сообщить об ошибке
   */
  public reportError(error?: string) {
    if (this.currentProvider) {
      this.currentProvider.failCount++;
      console.log(`[ResilientDB] Error reported for ${this.currentProvider.name}: ${error || 'unknown'}`);
      
      if (this.currentProvider.failCount >= this.MAX_FAIL_COUNT) {
        this.currentProvider.isHealthy = false;
        this.selectNextProvider();
      }
      
      this.saveState();
    }
  }

  private selectNextProvider() {
    const healthyProviders = this.providers.filter(p => p.isHealthy);
    if (healthyProviders.length > 0) {
      this.currentProvider = healthyProviders[0];
      console.log(`[ResilientDB] Switched to ${this.currentProvider.name}`);
    } else {
      console.warn('[ResilientDB] No healthy database providers!');
    }
  }

  /**
   * Сбросить состояние
   */
  public resetProvider(name?: string) {
    if (name) {
      const provider = this.providers.find(p => p.name === name);
      if (provider) {
        provider.failCount = 0;
        provider.isHealthy = true;
      }
    } else {
      this.providers.forEach(p => {
        p.failCount = 0;
        p.isHealthy = true;
      });
    }
    this.saveState();
  }

  /**
   * Получить текущего провайдера
   */
  public getCurrentProvider(): DatabaseProvider | null {
    return this.currentProvider;
  }

  /**
   * Получить статус
   */
  public getStatus(): {
    online: boolean;
    currentProvider: DatabaseProvider | null;
    providers: DatabaseProvider[];
    queuedOperations: number;
    cacheSize: number;
  } {
    return {
      online: this.isOnline(),
      currentProvider: this.currentProvider,
      providers: [...this.providers],
      queuedOperations: this.offlineQueue.length,
      cacheSize: this.cache.size,
    };
  }
}

// Singleton instance
let instance: ResilientDatabaseService | null = null;

export function getResilientDB(): ResilientDatabaseService {
  if (!instance) {
    instance = new ResilientDatabaseService();
  }
  return instance;
}

export type { DatabaseProvider, CacheEntry };
export default ResilientDatabaseService;
