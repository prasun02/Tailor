import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DesignFormValues } from './designSchemas';
import { designKeys } from './designQueryKeys';
import {
  archiveGarmentDesign,
  createGarmentDesign,
  listGarmentDesigns,
  restoreGarmentDesign,
  updateGarmentDesign,
} from './designService';
import type { DesignFilters } from './types';

export function useGarmentDesigns(shopId: string | null, filters: DesignFilters = {}) {
  const hasEmptyGarmentTypeList = Array.isArray(filters.garmentTypeIds) && filters.garmentTypeIds.length === 0;

  return useQuery({
    queryKey: designKeys.list(shopId ?? '', filters),
    queryFn: () => listGarmentDesigns(shopId ?? '', filters),
    enabled: Boolean(shopId) && !hasEmptyGarmentTypeList,
  });
}

export function useCreateGarmentDesign(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DesignFormValues) => createGarmentDesign(shopId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: designKeys.lists(shopId) });
    },
  });
}

export function useUpdateGarmentDesign(shopId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DesignFormValues) => updateGarmentDesign(shopId, designId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: designKeys.lists(shopId) });
    },
  });
}

export function useArchiveGarmentDesign(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => archiveGarmentDesign(shopId, designId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: designKeys.lists(shopId) });
    },
  });
}

export function useRestoreGarmentDesign(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => restoreGarmentDesign(shopId, designId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: designKeys.lists(shopId) });
    },
  });
}
