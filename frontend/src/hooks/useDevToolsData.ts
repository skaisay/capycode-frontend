'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserSubscription, getUsageStats, getGenerationHistory, STRIPE_PLANS } from '@/lib/stripe';
import type { GenerationHistoryEntry } from '@/lib/stripe';

export interface LogEntry {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  details?: string;
}

export interface DevToolsData {
  logs: LogEntry[];
  history: GenerationHistoryEntry[];
  credits: {
    used: number;
    total: number;
    plan: string;
  };
  isLoading: boolean;
  addLog: (type: LogEntry['type'], message: string, details?: string) => void;
  clearLogs: () => void;
  refreshData: () => Promise<void>;
}

export function useDevToolsData(): DevToolsData {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [credits, setCredits] = useState({ used: 0, total: 0, plan: 'Free' });
  const [isLoading, setIsLoading] = useState(true);

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string, details?: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      details,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Fetch data from Supabase
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch subscription and usage in parallel
      const [subscription, usage, historyData] = await Promise.all([
        getUserSubscription(),
        getUsageStats(),
        getGenerationHistory(20),
      ]);

      // Update credits based on plan
      const planId = subscription?.plan_id || 'free';
      const plan = STRIPE_PLANS[planId];
      const dailyLimit = plan.limits.generationsPerDay;
      
      setCredits({
        used: usage.generations_today,
        total: dailyLimit === -1 ? 999 : dailyLimit, // -1 means unlimited
        plan: plan.name,
      });

      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching DevTools data:', error);
      addLog('error', 'Failed to load user data', String(error));
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  // Initial fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    logs,
    history,
    credits,
    isLoading,
    addLog,
    clearLogs,
    refreshData,
  };
}
