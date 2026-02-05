'use client';

import React, { useState } from 'react';
import { useSystemHealth } from '@/lib/services/hooks';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Server,
  Brain,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SystemHealthMonitorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export function SystemHealthMonitor({ compact = false, showDetails = true }: SystemHealthMonitorProps) {
  const { health, loading, refresh, isHealthy, isDegraded, isCritical } = useSystemHealth();
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down':
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20';
      case 'degraded': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'down':
      case 'critical': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down':
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'sandbox': return <Server className="w-4 h-4" />;
      case 'ai': return <Brain className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (loading && !health) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking services...</span>
      </div>
    );
  }

  if (!health) return null;

  // Compact mode - just a status indicator
  if (compact) {
    return (
      <button 
        onClick={() => refresh()}
        className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm ${getStatusBg(health.overall)} border transition-colors hover:opacity-80`}
        title={`System: ${health.overall}`}
      >
        {getStatusIcon(health.overall)}
        <span className={getStatusColor(health.overall)}>
          {health.overall === 'healthy' ? 'OK' : health.overall}
        </span>
      </button>
    );
  }

  return (
    <div className={`rounded-lg border ${getStatusBg(health.overall)} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(health.overall)}
          <div>
            <h3 className="font-semibold text-white">System Status</h3>
            <p className={`text-sm ${getStatusColor(health.overall)}`}>
              {isHealthy && 'All systems operational'}
              {isDegraded && 'Some services degraded'}
              {isCritical && 'Critical issues detected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Uptime: {formatUptime(health.uptime)}
          </span>
          <button 
            onClick={() => refresh()} 
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {showDetails && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Services Overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {health.services.map((service) => (
          <div 
            key={service.type}
            className={`p-3 rounded-md ${getStatusBg(service.status)} border`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getServiceIcon(service.type)}
              <span className="text-sm font-medium">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <span className={`text-xs ${getStatusColor(service.status)}`}>
                {service.activeProvider || service.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View */}
      {showDetails && expanded && (
        <div className="border-t border-white/10 pt-4 space-y-4">
          {health.services.map((service) => (
            <div key={service.type} className="space-y-2">
              <div className="flex items-center gap-2">
                {getServiceIcon(service.type)}
                <span className="font-medium">{service.name}</span>
                {getStatusIcon(service.status)}
              </div>
              
              <div className="ml-6 space-y-1">
                {service.providers.map((provider) => (
                  <div 
                    key={provider.name}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      {provider.healthy ? (
                        <Wifi className="w-3 h-3 text-green-500" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-500" />
                      )}
                      <span className={provider.healthy ? 'text-gray-300' : 'text-gray-500'}>
                        {provider.name}
                      </span>
                      {service.activeProvider === provider.name && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {provider.responseTime !== undefined && (
                      <span className="text-xs text-gray-500">
                        {provider.responseTime}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="text-xs text-gray-500 pt-2 border-t border-white/10">
            Version: {health.version} | Last check: {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemHealthMonitor;
