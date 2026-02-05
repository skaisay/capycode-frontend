import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, Build } from '@/lib/api';
import { useBuildStore } from '@/stores/buildStore';

interface UseBuildsOptions {
  projectId: string;
}

export function useBuilds({ projectId }: UseBuildsOptions) {
  const queryClient = useQueryClient();
  const { setBuilds, addBuild, updateBuild, setIsBuilding } = useBuildStore();

  // Fetch builds
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['builds', projectId],
    queryFn: async () => {
      const result = await api.getBuilds(projectId);
      setBuilds(result.builds);
      return result.builds;
    },
    enabled: !!projectId,
  });

  // Start build mutation
  const startBuildMutation = useMutation({
    mutationFn: async ({
      platform,
      profile,
    }: {
      platform: 'ios' | 'android' | 'all';
      profile: 'development' | 'preview' | 'production';
    }) => {
      setIsBuilding(true);
      const result = await api.startBuild(projectId, platform, profile);
      return result.build;
    },
    onSuccess: (build) => {
      addBuild(build);
      queryClient.invalidateQueries({ queryKey: ['builds', projectId] });
    },
    onError: () => {
      setIsBuilding(false);
    },
  });

  // Cancel build mutation
  const cancelBuildMutation = useMutation({
    mutationFn: async (buildId: string) => {
      await api.cancelBuild(buildId);
      return buildId;
    },
    onSuccess: (buildId) => {
      updateBuild(buildId, { status: 'canceled' });
      setIsBuilding(false);
      queryClient.invalidateQueries({ queryKey: ['builds', projectId] });
    },
  });

  const startBuild = useCallback(
    (platform: 'ios' | 'android' | 'all', profile: 'development' | 'preview' | 'production') => {
      startBuildMutation.mutate({ platform, profile });
    },
    [startBuildMutation]
  );

  const cancelBuild = useCallback(
    (buildId: string) => {
      cancelBuildMutation.mutate(buildId);
    },
    [cancelBuildMutation]
  );

  return {
    builds: data || [],
    isLoading,
    error,
    startBuild,
    cancelBuild,
    isStarting: startBuildMutation.isPending,
    isCanceling: cancelBuildMutation.isPending,
    refetch,
  };
}

interface UseBuildStatusOptions {
  buildId: string;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useBuildStatus({
  buildId,
  enabled = true,
  pollingInterval = 5000,
}: UseBuildStatusOptions) {
  const { updateBuild, setIsBuilding, addLog } = useBuildStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['build-status', buildId],
    queryFn: async () => {
      const result = await api.getBuildStatus(buildId);
      const build = result.build;
      
      updateBuild(buildId, build);
      
      // Update building state
      if (build.status === 'completed' || build.status === 'failed' || build.status === 'canceled') {
        setIsBuilding(false);
        addLog(`Build ${build.status}: ${build.id}`);
      }
      
      return build;
    },
    enabled: !!buildId && enabled,
    refetchInterval: (query) => {
      const build = query.state.data as Build | undefined;
      // Stop polling if build is complete
      if (build && ['completed', 'failed', 'canceled'].includes(build.status)) {
        return false;
      }
      return pollingInterval;
    },
  });

  return {
    build: data,
    isLoading,
    error,
  };
}
