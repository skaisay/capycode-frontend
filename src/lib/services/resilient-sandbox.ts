/**
 * Resilient Sandbox Service
 * Отказоустойчивый сервис с автоматическим failover между провайдерами
 */

interface SandboxProvider {
  name: string;
  url: string;
  priority: number;
  isHealthy: boolean;
  lastCheck: number;
  responseTime: number;
  failCount: number;
}

interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  error?: string;
}

class ResilientSandboxService {
  private providers: SandboxProvider[] = [];
  private currentProvider: SandboxProvider | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 секунд
  private readonly HEALTH_CHECK_TIMEOUT = 10000; // 10 секунд таймаут
  private readonly MAX_FAIL_COUNT = 3; // После 3 ошибок переключаемся
  private readonly CACHE_KEY = 'sandbox_provider_state';

  constructor() {
    // Инициализируем провайдеров из env или дефолтных значений
    this.initProviders();
    this.loadState();
    this.startHealthChecks();
  }

  private initProviders() {
    // Основные провайдеры Sandbox API
    const providerUrls = this.getProviderUrls();
    
    this.providers = providerUrls.map((url, index) => ({
      name: this.getProviderName(url),
      url: url.replace(/\/$/, ''), // убираем trailing slash
      priority: index,
      isHealthy: true, // предполагаем здоровым до проверки
      lastCheck: 0,
      responseTime: 0,
      failCount: 0,
    }));
  }

  private getProviderUrls(): string[] {
    // Берём из env переменных или используем дефолтные
    const urls: string[] = [];
    
    // Основной URL
    const primaryUrl = process.env.NEXT_PUBLIC_SANDBOX_API_URL;
    if (primaryUrl) urls.push(primaryUrl);
    
    // Резервные URL (можно добавить в .env.local)
    const backupUrls = process.env.NEXT_PUBLIC_SANDBOX_BACKUP_URLS;
    if (backupUrls) {
      urls.push(...backupUrls.split(',').map(u => u.trim()));
    }
    
    // Если ничего нет - используем дефолтные
    if (urls.length === 0) {
      urls.push(
        'https://capycode-sandbox-api.onrender.com',  // Render (primary)
        'https://capycode-sandbox.up.railway.app',     // Railway (backup)
        'https://capycode-sandbox.fly.dev',            // Fly.io (backup)
      );
    }
    
    return urls;
  }

  private getProviderName(url: string): string {
    if (url.includes('render.com') || url.includes('onrender.com')) return 'Render';
    if (url.includes('railway.app')) return 'Railway';
    if (url.includes('fly.dev') || url.includes('fly.io')) return 'Fly.io';
    if (url.includes('localhost')) return 'Local';
    return 'Unknown';
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.CACHE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Восстанавливаем состояние провайдеров
        state.providers?.forEach((savedProvider: Partial<SandboxProvider>) => {
          const provider = this.providers.find(p => p.url === savedProvider.url);
          if (provider) {
            provider.isHealthy = savedProvider.isHealthy ?? true;
            provider.failCount = savedProvider.failCount ?? 0;
            provider.responseTime = savedProvider.responseTime ?? 0;
          }
        });
        
        // Восстанавливаем текущего провайдера
        if (state.currentUrl) {
          this.currentProvider = this.providers.find(p => p.url === state.currentUrl) || null;
        }
      }
    } catch (e) {
      console.warn('[ResilientSandbox] Failed to load state:', e);
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    
    try {
      const state = {
        providers: this.providers.map(p => ({
          url: p.url,
          isHealthy: p.isHealthy,
          failCount: p.failCount,
          responseTime: p.responseTime,
        })),
        currentUrl: this.currentProvider?.url,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[ResilientSandbox] Failed to save state:', e);
    }
  }

  private async checkHealth(provider: SandboxProvider): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);
      
      const response = await fetch(`${provider.url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          healthy: data.status === 'ok' || data.e2bConfigured === true,
          responseTime,
        };
      }
      
      return {
        healthy: false,
        responseTime,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Connection failed',
      };
    }
  }

  private async checkAllProviders() {
    console.log('[ResilientSandbox] Checking all providers...');
    
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        const result = await this.checkHealth(provider);
        
        provider.lastCheck = Date.now();
        provider.responseTime = result.responseTime;
        
        if (result.healthy) {
          provider.isHealthy = true;
          provider.failCount = 0;
          console.log(`[ResilientSandbox] ✅ ${provider.name} healthy (${result.responseTime}ms)`);
        } else {
          provider.failCount++;
          if (provider.failCount >= this.MAX_FAIL_COUNT) {
            provider.isHealthy = false;
            console.log(`[ResilientSandbox] ❌ ${provider.name} marked unhealthy: ${result.error}`);
          } else {
            console.log(`[ResilientSandbox] ⚠️ ${provider.name} failed (${provider.failCount}/${this.MAX_FAIL_COUNT}): ${result.error}`);
          }
        }
        
        return { provider, result };
      })
    );
    
    // Если текущий провайдер нездоров - переключаемся
    if (this.currentProvider && !this.currentProvider.isHealthy) {
      this.selectBestProvider();
    }
    
    // Если нет текущего провайдера - выбираем лучшего
    if (!this.currentProvider) {
      this.selectBestProvider();
    }
    
    this.saveState();
    
    return results;
  }

  private selectBestProvider() {
    // Выбираем здорового провайдера с лучшим временем отклика и приоритетом
    const healthyProviders = this.providers
      .filter(p => p.isHealthy)
      .sort((a, b) => {
        // Сначала по приоритету
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Затем по времени отклика
        return a.responseTime - b.responseTime;
      });
    
    if (healthyProviders.length > 0) {
      const newProvider = healthyProviders[0];
      if (this.currentProvider?.url !== newProvider.url) {
        console.log(`[ResilientSandbox] Switching to ${newProvider.name} (${newProvider.url})`);
        this.currentProvider = newProvider;
      }
    } else {
      console.warn('[ResilientSandbox] No healthy providers available!');
      // В крайнем случае используем первого из списка
      this.currentProvider = this.providers[0] || null;
    }
    
    this.saveState();
  }

  private startHealthChecks() {
    // Не запускаем на сервере
    if (typeof window === 'undefined') return;
    
    // Первая проверка сразу
    this.checkAllProviders();
    
    // Периодические проверки
    this.healthCheckInterval = setInterval(() => {
      this.checkAllProviders();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  public stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Получить URL текущего активного провайдера
   */
  public getActiveUrl(): string {
    if (!this.currentProvider) {
      this.selectBestProvider();
    }
    return this.currentProvider?.url || this.providers[0]?.url || '';
  }

  /**
   * Получить информацию о текущем провайдере
   */
  public getActiveProvider(): SandboxProvider | null {
    return this.currentProvider;
  }

  /**
   * Получить статус всех провайдеров
   */
  public getProvidersStatus(): SandboxProvider[] {
    return [...this.providers];
  }

  /**
   * Принудительно переключиться на следующего провайдера
   */
  public switchToNext(): boolean {
    const currentIndex = this.currentProvider 
      ? this.providers.findIndex(p => p.url === this.currentProvider!.url)
      : -1;
    
    // Ищем следующего здорового провайдера
    for (let i = 1; i <= this.providers.length; i++) {
      const nextIndex = (currentIndex + i) % this.providers.length;
      const nextProvider = this.providers[nextIndex];
      
      if (nextProvider.isHealthy || nextProvider.failCount < this.MAX_FAIL_COUNT) {
        console.log(`[ResilientSandbox] Manually switching to ${nextProvider.name}`);
        this.currentProvider = nextProvider;
        this.saveState();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Сообщить об ошибке текущего провайдера
   */
  public reportError(error?: string) {
    if (this.currentProvider) {
      this.currentProvider.failCount++;
      console.log(`[ResilientSandbox] Error reported for ${this.currentProvider.name}: ${error || 'unknown'}`);
      
      if (this.currentProvider.failCount >= this.MAX_FAIL_COUNT) {
        this.currentProvider.isHealthy = false;
        this.selectBestProvider();
      }
      
      this.saveState();
    }
  }

  /**
   * Выполнить запрос с автоматическим failover
   */
  public async fetch(
    path: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const maxRetries = this.providers.length;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const url = this.getActiveUrl();
      if (!url) {
        throw new Error('No sandbox providers available');
      }
      
      try {
        const response = await fetch(`${url}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        // Успешный запрос - сбрасываем счётчик ошибок
        if (this.currentProvider) {
          this.currentProvider.failCount = 0;
          this.currentProvider.isHealthy = true;
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`[ResilientSandbox] Request failed on ${this.currentProvider?.name}: ${error.message}`);
        
        // Помечаем ошибку и переключаемся
        this.reportError(error.message);
        
        // Если есть другие провайдеры - пробуем их
        if (!this.switchToNext()) {
          break; // Нет больше провайдеров
        }
      }
    }
    
    throw lastError || new Error('All sandbox providers failed');
  }
}

// Singleton instance
let instance: ResilientSandboxService | null = null;

export function getResilientSandbox(): ResilientSandboxService {
  if (!instance) {
    instance = new ResilientSandboxService();
  }
  return instance;
}

export type { SandboxProvider, HealthCheckResult };
export default ResilientSandboxService;
