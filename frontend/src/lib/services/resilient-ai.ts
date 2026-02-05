/**
 * Resilient AI Service
 * Отказоустойчивый AI сервис с автоматическим failover между провайдерами
 */

interface AIProvider {
  name: string;
  baseUrl: string;
  models: string[];
  priority: number;
  isHealthy: boolean;
  lastCheck: number;
  failCount: number;
  requiresKey: boolean;
  keyEnvVar?: string;
}

interface AIProviderConfig {
  providers: AIProvider[];
  modelMappings: Record<string, string[]>; // model -> [provider/model alternatives]
}

class ResilientAIService {
  private providers: AIProvider[] = [];
  private currentProvider: AIProvider | null = null;
  private readonly MAX_FAIL_COUNT = 3;
  private readonly CACHE_KEY = 'ai_provider_state';

  constructor() {
    this.initProviders();
    this.loadState();
  }

  private initProviders() {
    // Инициализируем доступные AI провайдеры
    this.providers = [
      {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
          'anthropic/claude-sonnet-4',
          'anthropic/claude-3.5-sonnet',
          'openai/gpt-4o',
          'openai/gpt-4o-mini',
          'google/gemini-2.0-flash-exp:free',
          'meta-llama/llama-3.3-70b-instruct',
          'deepseek/deepseek-chat',
          'qwen/qwen-2.5-coder-32b-instruct',
        ],
        priority: 1,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
        requiresKey: true,
        keyEnvVar: 'OPENROUTER_API_KEY',
      },
      {
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1',
        models: [
          'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          'Qwen/Qwen2.5-Coder-32B-Instruct',
          'deepseek-ai/DeepSeek-V3',
          'codellama/CodeLlama-70b-Instruct-hf',
        ],
        priority: 2,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
        requiresKey: true,
        keyEnvVar: 'TOGETHER_API_KEY',
      },
      {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: [
          'llama-3.3-70b-versatile',
          'llama-3.1-70b-versatile',
          'mixtral-8x7b-32768',
        ],
        priority: 3,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
        requiresKey: true,
        keyEnvVar: 'GROQ_API_KEY',
      },
      {
        name: 'Fireworks',
        baseUrl: 'https://api.fireworks.ai/inference/v1',
        models: [
          'accounts/fireworks/models/llama-v3p3-70b-instruct',
          'accounts/fireworks/models/deepseek-v3',
          'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
        ],
        priority: 4,
        isHealthy: true,
        lastCheck: 0,
        failCount: 0,
        requiresKey: true,
        keyEnvVar: 'FIREWORKS_API_KEY',
      },
    ];

    // Маппинг моделей между провайдерами (для failover)
    this.modelMappings = {
      // Claude -> fallbacks
      'anthropic/claude-sonnet-4': [
        'openrouter:anthropic/claude-sonnet-4',
        'openrouter:anthropic/claude-3.5-sonnet',
      ],
      'anthropic/claude-3.5-sonnet': [
        'openrouter:anthropic/claude-3.5-sonnet',
        'openrouter:openai/gpt-4o',
      ],
      // GPT-4 -> fallbacks  
      'openai/gpt-4o': [
        'openrouter:openai/gpt-4o',
        'openrouter:anthropic/claude-sonnet-4',
      ],
      'openai/gpt-4o-mini': [
        'openrouter:openai/gpt-4o-mini',
        'groq:llama-3.3-70b-versatile',
        'together:meta-llama/Llama-3.3-70B-Instruct-Turbo',
      ],
      // Free models
      'google/gemini-2.0-flash-exp:free': [
        'openrouter:google/gemini-2.0-flash-exp:free',
        'groq:llama-3.3-70b-versatile',
      ],
      // DeepSeek
      'deepseek/deepseek-chat': [
        'openrouter:deepseek/deepseek-chat',
        'fireworks:accounts/fireworks/models/deepseek-v3',
        'together:deepseek-ai/DeepSeek-V3',
      ],
      // Qwen Coder
      'qwen/qwen-2.5-coder-32b-instruct': [
        'openrouter:qwen/qwen-2.5-coder-32b-instruct',
        'together:Qwen/Qwen2.5-Coder-32B-Instruct',
        'fireworks:accounts/fireworks/models/qwen2p5-coder-32b-instruct',
      ],
      // Llama
      'meta-llama/llama-3.3-70b-instruct': [
        'openrouter:meta-llama/llama-3.3-70b-instruct',
        'groq:llama-3.3-70b-versatile',
        'together:meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'fireworks:accounts/fireworks/models/llama-v3p3-70b-instruct',
      ],
    };
  }

  private modelMappings: Record<string, string[]> = {};

  private loadState() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.CACHE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        state.providers?.forEach((savedProvider: Partial<AIProvider>) => {
          const provider = this.providers.find(p => p.name === savedProvider.name);
          if (provider) {
            provider.isHealthy = savedProvider.isHealthy ?? true;
            provider.failCount = savedProvider.failCount ?? 0;
          }
        });
      }
    } catch (e) {
      console.warn('[ResilientAI] Failed to load state:', e);
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
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[ResilientAI] Failed to save state:', e);
    }
  }

  /**
   * Получить альтернативные модели для failover
   */
  public getModelAlternatives(model: string): string[] {
    return this.modelMappings[model] || [`openrouter:${model}`];
  }

  /**
   * Парсинг provider:model формата
   */
  public parseModelSpec(spec: string): { provider: string; model: string } {
    const [provider, ...modelParts] = spec.split(':');
    return {
      provider,
      model: modelParts.join(':'),
    };
  }

  /**
   * Получить провайдера по имени
   */
  public getProvider(name: string): AIProvider | undefined {
    return this.providers.find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Получить здоровых провайдеров
   */
  public getHealthyProviders(): AIProvider[] {
    return this.providers.filter(p => p.isHealthy).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Сообщить об ошибке провайдера
   */
  public reportError(providerName: string, error?: string) {
    const provider = this.getProvider(providerName);
    if (provider) {
      provider.failCount++;
      console.log(`[ResilientAI] Error reported for ${providerName}: ${error || 'unknown'}`);
      
      if (provider.failCount >= this.MAX_FAIL_COUNT) {
        provider.isHealthy = false;
        console.log(`[ResilientAI] ❌ ${providerName} marked unhealthy`);
      }
      
      this.saveState();
    }
  }

  /**
   * Сбросить статус провайдера
   */
  public resetProvider(providerName: string) {
    const provider = this.getProvider(providerName);
    if (provider) {
      provider.failCount = 0;
      provider.isHealthy = true;
      this.saveState();
    }
  }

  /**
   * Получить все провайдеры
   */
  public getAllProviders(): AIProvider[] {
    return [...this.providers];
  }

  /**
   * Получить статус системы
   */
  public getStatus(): {
    healthy: number;
    total: number;
    providers: AIProvider[];
  } {
    return {
      healthy: this.providers.filter(p => p.isHealthy).length,
      total: this.providers.length,
      providers: this.getAllProviders(),
    };
  }
}

// Singleton instance
let instance: ResilientAIService | null = null;

export function getResilientAI(): ResilientAIService {
  if (!instance) {
    instance = new ResilientAIService();
  }
  return instance;
}

export type { AIProvider, AIProviderConfig };
export default ResilientAIService;
