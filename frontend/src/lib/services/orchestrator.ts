/**
 * Service Orchestrator
 * Центральный оркестратор всех отказоустойчивых сервисов
 * Единая точка управления инфраструктурой
 */

import { getResilientSandbox, type SandboxProvider } from './resilient-sandbox';
import { getResilientAI, type AIProvider } from './resilient-ai';
import { getResilientDB, type DatabaseProvider } from './resilient-database';

export interface ServiceStatus {
  name: string;
  type: 'sandbox' | 'ai' | 'database' | 'cdn' | 'auth';
  status: 'healthy' | 'degraded' | 'down';
  activeProvider: string | null;
  providers: {
    name: string;
    healthy: boolean;
    responseTime?: number;
  }[];
  lastCheck: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceStatus[];
  timestamp: number;
  uptime: number;
  version: string;
}

class ServiceOrchestrator {
  private startTime: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(health: SystemHealth) => void> = new Set();
  
  private readonly VERSION = '1.0.0';
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 минута

  constructor() {
    this.startTime = Date.now();
    this.startMonitoring();
  }

  private startMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Периодическая проверка здоровья всех сервисов
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices();
    }, this.HEALTH_CHECK_INTERVAL);
    
    // Начальная проверка
    setTimeout(() => this.checkAllServices(), 1000);
  }

  public stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Получить статус всех сервисов
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const services: ServiceStatus[] = [];
    
    // Sandbox Service
    const sandbox = getResilientSandbox();
    const sandboxProviders = sandbox.getProvidersStatus();
    const sandboxActive = sandbox.getActiveProvider();
    const healthySandbox = sandboxProviders.filter(p => p.isHealthy).length;
    
    services.push({
      name: 'Sandbox API',
      type: 'sandbox',
      status: healthySandbox === 0 ? 'down' : healthySandbox < sandboxProviders.length ? 'degraded' : 'healthy',
      activeProvider: sandboxActive?.name || null,
      providers: sandboxProviders.map(p => ({
        name: p.name,
        healthy: p.isHealthy,
        responseTime: p.responseTime,
      })),
      lastCheck: Math.max(...sandboxProviders.map(p => p.lastCheck)),
    });

    // AI Service
    const ai = getResilientAI();
    const aiProviders = ai.getAllProviders();
    const healthyAI = aiProviders.filter(p => p.isHealthy).length;
    
    services.push({
      name: 'AI Models',
      type: 'ai',
      status: healthyAI === 0 ? 'down' : healthyAI < aiProviders.length ? 'degraded' : 'healthy',
      activeProvider: aiProviders.find(p => p.isHealthy)?.name || null,
      providers: aiProviders.map(p => ({
        name: p.name,
        healthy: p.isHealthy,
      })),
      lastCheck: Date.now(),
    });

    // Database Service
    const db = getResilientDB();
    const dbStatus = db.getStatus();
    
    services.push({
      name: 'Database',
      type: 'database',
      status: dbStatus.online ? (dbStatus.currentProvider?.isHealthy ? 'healthy' : 'degraded') : 'down',
      activeProvider: dbStatus.currentProvider?.name || null,
      providers: dbStatus.providers.map(p => ({
        name: p.name,
        healthy: p.isHealthy,
      })),
      lastCheck: Date.now(),
    });

    // Определяем общий статус
    const downServices = services.filter(s => s.status === 'down').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (downServices > 0) {
      overall = 'critical';
    } else if (degradedServices > 0) {
      overall = 'degraded';
    }

    const health: SystemHealth = {
      overall,
      services,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: this.VERSION,
    };

    // Уведомляем слушателей
    this.notifyListeners(health);

    return health;
  }

  private async checkAllServices() {
    await this.getSystemHealth();
  }

  /**
   * Подписаться на обновления здоровья
   */
  public subscribe(callback: (health: SystemHealth) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(health: SystemHealth) {
    this.listeners.forEach(callback => {
      try {
        callback(health);
      } catch (e) {
        console.error('[Orchestrator] Listener error:', e);
      }
    });
  }

  /**
   * Получить URL для Sandbox API
   */
  public getSandboxUrl(): string {
    return getResilientSandbox().getActiveUrl();
  }

  /**
   * Выполнить запрос к Sandbox API с failover
   */
  public async fetchSandbox(path: string, options?: RequestInit): Promise<Response> {
    return getResilientSandbox().fetch(path, options);
  }

  /**
   * Получить альтернативы для AI модели
   */
  public getAIAlternatives(model: string): string[] {
    return getResilientAI().getModelAlternatives(model);
  }

  /**
   * Кэшировать данные
   */
  public cacheData<T>(key: string, data: T, ttlMs?: number): void {
    getResilientDB().setCache(key, data, ttlMs);
  }

  /**
   * Получить данные из кэша
   */
  public getCachedData<T>(key: string): T | null {
    return getResilientDB().getCache<T>(key);
  }

  /**
   * Сбросить все сервисы
   */
  public resetAll() {
    const sandbox = getResilientSandbox();
    const ai = getResilientAI();
    const db = getResilientDB();
    
    // Сбрасываем sandbox
    sandbox.getProvidersStatus().forEach(p => {
      // Reset logic would go here if we add a reset method
    });
    
    // Сбрасываем AI
    ai.getAllProviders().forEach(p => {
      ai.resetProvider(p.name);
    });
    
    // Сбрасываем DB
    db.resetProvider();
    
    console.log('[Orchestrator] All services reset');
  }

  /**
   * Получить сводку для отладки
   */
  public getDebugSummary(): string {
    const sandbox = getResilientSandbox();
    const ai = getResilientAI();
    const db = getResilientDB();
    
    return JSON.stringify({
      sandbox: {
        active: sandbox.getActiveProvider()?.name,
        providers: sandbox.getProvidersStatus().map(p => ({
          name: p.name,
          healthy: p.isHealthy,
          responseTime: p.responseTime,
        })),
      },
      ai: {
        status: ai.getStatus(),
      },
      database: db.getStatus(),
      uptime: Date.now() - this.startTime,
    }, null, 2);
  }
}

// Singleton instance
let orchestrator: ServiceOrchestrator | null = null;

export function getOrchestrator(): ServiceOrchestrator {
  if (!orchestrator) {
    orchestrator = new ServiceOrchestrator();
  }
  return orchestrator;
}

export default ServiceOrchestrator;
