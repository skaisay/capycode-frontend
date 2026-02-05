import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, SnackSession, WebPreview } from '@/lib/api';

interface UsePreviewOptions {
  projectId: string;
}

export function useSnackPreview({ projectId }: UsePreviewOptions) {
  const queryClient = useQueryClient();

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const result = await api.createSnackSession(projectId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snack-session', projectId] });
    },
  });

  // Get QR code query
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['snack-qr', createSessionMutation.data?.sessionId],
    queryFn: async () => {
      if (!createSessionMutation.data?.sessionId) return null;
      return api.getSnackQRCode(createSessionMutation.data.sessionId);
    },
    enabled: !!createSessionMutation.data?.sessionId,
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (files: Record<string, { type: string; contents: string }>) => {
      if (!createSessionMutation.data?.sessionId) {
        throw new Error('No active session');
      }
      await api.updateSnackSession(createSessionMutation.data.sessionId, files);
    },
  });

  const createSession = useCallback(() => {
    createSessionMutation.mutate();
  }, [createSessionMutation]);

  const updateSession = useCallback(
    (files: Record<string, { type: string; contents: string }>) => {
      updateSessionMutation.mutate(files);
    },
    [updateSessionMutation]
  );

  return {
    session: createSessionMutation.data,
    isCreating: createSessionMutation.isPending,
    createSession,
    updateSession,
    isUpdating: updateSessionMutation.isPending,
    qrCodeUrl: qrData?.qrCodeUrl,
    expoUrl: qrData?.expoUrl || createSessionMutation.data?.expoUrl,
    qrLoading,
    error: createSessionMutation.error || updateSessionMutation.error,
  };
}

export function useWebPreview({ projectId }: UsePreviewOptions) {
  const queryClient = useQueryClient();

  // Create preview mutation
  const createPreviewMutation = useMutation({
    mutationFn: async () => {
      const result = await api.createWebPreview(projectId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-preview', projectId] });
    },
  });

  // Get preview query
  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['web-preview', projectId],
    queryFn: async () => {
      return api.getWebPreview(projectId);
    },
    enabled: !!projectId,
  });

  const createPreview = useCallback(() => {
    createPreviewMutation.mutate();
  }, [createPreviewMutation]);

  return {
    preview,
    isLoading,
    createPreview,
    isCreating: createPreviewMutation.isPending,
    error: error || createPreviewMutation.error,
  };
}
