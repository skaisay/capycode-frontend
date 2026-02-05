import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();

        // Attempt to reconnect
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          onMessage?.(message);
        } catch {
          console.error('Failed to parse WebSocket message:', event.data);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
    reconnect: connect,
  };
}

// Hook for build progress updates
interface BuildProgressMessage {
  type: 'build_progress' | 'build_complete' | 'build_failed';
  buildId: string;
  progress?: number;
  stage?: string;
  message?: string;
  artifactUrl?: string;
  error?: string;
}

interface UseBuildWebSocketOptions {
  userId: string;
  onProgress?: (buildId: string, progress: number, stage: string, message: string) => void;
  onComplete?: (buildId: string, artifactUrl: string) => void;
  onFailed?: (buildId: string, error: string) => void;
}

export function useBuildWebSocket(options: UseBuildWebSocketOptions) {
  const { userId, onProgress, onComplete, onFailed } = options;

  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws`;

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const buildMessage = message as unknown as BuildProgressMessage;

      switch (buildMessage.type) {
        case 'build_progress':
          onProgress?.(
            buildMessage.buildId,
            buildMessage.progress || 0,
            buildMessage.stage || '',
            buildMessage.message || ''
          );
          break;
        case 'build_complete':
          onComplete?.(buildMessage.buildId, buildMessage.artifactUrl || '');
          break;
        case 'build_failed':
          onFailed?.(buildMessage.buildId, buildMessage.error || 'Unknown error');
          break;
      }
    },
    [onProgress, onComplete, onFailed]
  );

  const { isConnected, send, ...rest } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      // Subscribe to user's build updates
      send({ type: 'subscribe', userId });
    },
  });

  return {
    isConnected,
    ...rest,
  };
}
