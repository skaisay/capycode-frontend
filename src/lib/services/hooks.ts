/**
 * React Hooks для отказоустойчивых сервисов
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrchestrator, type SystemHealth, type ServiceStatus } from './orchestrator';

/**
 * Hook для мониторинга здоровья всей системы
 */
export function useSystemHealth(autoRefresh: boolean = true) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const orchestrator = getOrchestrator();
      const newHealth = await orchestrator.getSystemHealth();
      setHealth(newHealth);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    
    if (autoRefresh) {
      const orchestrator = getOrchestrator();
      const unsubscribe = orchestrator.subscribe((newHealth) => {
        setHealth(newHealth);
      });
      
      return unsubscribe;
    }
  }, [autoRefresh, refresh]);

  return {
    health,
    loading,
    error,
    refresh,
    isHealthy: health?.overall === 'healthy',
    isDegraded: health?.overall === 'degraded',
    isCritical: health?.overall === 'critical',
  };
}

/**
 * Hook для мониторинга конкретного сервиса
 */
export function useServiceStatus(serviceType: 'sandbox' | 'ai' | 'database') {
  const { health, loading, refresh } = useSystemHealth();
  
  const service = health?.services.find(s => s.type === serviceType);
  
  return {
    service,
    loading,
    refresh,
    isHealthy: service?.status === 'healthy',
    isDegraded: service?.status === 'degraded',
    isDown: service?.status === 'down',
    activeProvider: service?.activeProvider,
  };
}

/**
 * Hook для работы с Sandbox API
 */
export function useSandboxAPI() {
  const [url, setUrl] = useState<string>('');
  const { service, isDown } = useServiceStatus('sandbox');

  useEffect(() => {
    const orchestrator = getOrchestrator();
    setUrl(orchestrator.getSandboxUrl());
  }, [service]);

  const fetch = useCallback(async (path: string, options?: RequestInit) => {
    const orchestrator = getOrchestrator();
    return orchestrator.fetchSandbox(path, options);
  }, []);

  return {
    url,
    isAvailable: !isDown,
    fetch,
    activeProvider: service?.activeProvider,
  };
}

/**
 * Hook для кэширования данных
 */
export function useDataCache<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 300000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (force: boolean = false) => {
    const orchestrator = getOrchestrator();
    
    // Сначала проверяем кэш
    if (!force) {
      const cached = orchestrator.getCachedData<T>(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    
    // Загружаем свежие данные
    try {
      setLoading(true);
      const freshData = await fetcher();
      orchestrator.cacheData(key, freshData, ttlMs);
      setData(freshData);
      setError(null);
    } catch (e) {
      setError(e as Error);
      // Если ошибка - пробуем вернуть из кэша
      const cached = orchestrator.getCachedData<T>(key);
      if (cached !== null) {
        setData(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttlMs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh: () => refresh(true),
  };
}
