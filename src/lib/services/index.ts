/**
 * Resilient Services - Main Export
 * Единая точка входа для всех отказоустойчивых сервисов
 */

// Сервисы
export { 
  getResilientSandbox, 
  default as ResilientSandboxService,
  type SandboxProvider,
  type HealthCheckResult 
} from './resilient-sandbox';

export { 
  getResilientAI,
  default as ResilientAIService,
  type AIProvider,
  type AIProviderConfig 
} from './resilient-ai';

export { 
  getResilientDB,
  default as ResilientDatabaseService,
  type DatabaseProvider,
  type CacheEntry 
} from './resilient-database';

export { 
  getOrchestrator,
  default as ServiceOrchestrator,
  type ServiceStatus,
  type SystemHealth 
} from './orchestrator';

// Утилиты
export { useSystemHealth, useServiceStatus } from './hooks';
