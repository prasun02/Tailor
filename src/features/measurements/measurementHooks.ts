import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeasurementUnit } from '../../types/database';
import { configurationKeys } from './configurationQueryKeys';
import {
  createMeasurementVersion,
  getLatestMeasurementForGarment,
  getMeasurementDetail,
  getMeasurementValuesForCopy,
  getNewMeasurementContext,
  listActiveMeasurementFields,
  listCustomerMeasurementContext,
} from './measurementService';
import { measurementKeys } from './measurementQueryKeys';

export function useCustomerMeasurementContext(shopId: string | null, customerId: string | undefined) {
  return useQuery({
    queryKey: measurementKeys.customer(shopId ?? '', customerId ?? ''),
    queryFn: () => listCustomerMeasurementContext(shopId ?? '', customerId ?? ''),
    enabled: Boolean(shopId && customerId),
  });
}

export function useNewMeasurementContext(shopId: string | null, customerId: string | undefined) {
  return useQuery({
    queryKey: [...measurementKeys.customer(shopId ?? '', customerId ?? ''), 'new-context'],
    queryFn: () => getNewMeasurementContext(shopId ?? '', customerId ?? ''),
    enabled: Boolean(shopId && customerId),
  });
}

export function useActiveMeasurementFields(shopId: string | null, garmentTypeId: string | undefined) {
  return useQuery({
    queryKey: measurementKeys.fields(shopId ?? '', garmentTypeId ?? ''),
    queryFn: () => listActiveMeasurementFields(shopId ?? '', garmentTypeId ?? ''),
    enabled: Boolean(shopId && garmentTypeId),
  });
}

export function useLatestMeasurementForGarment(shopId: string | null, customerId: string | undefined, garmentTypeId: string | undefined) {
  return useQuery({
    queryKey: measurementKeys.latest(shopId ?? '', customerId ?? '', garmentTypeId ?? ''),
    queryFn: () => getLatestMeasurementForGarment(shopId ?? '', customerId ?? '', garmentTypeId ?? ''),
    enabled: Boolean(shopId && customerId && garmentTypeId),
  });
}

export function useMeasurementDetail(shopId: string | null, customerId: string | undefined, measurementId: string | undefined) {
  return useQuery({
    queryKey: measurementKeys.detail(shopId ?? '', customerId ?? '', measurementId ?? ''),
    queryFn: () => getMeasurementDetail(shopId ?? '', customerId ?? '', measurementId ?? ''),
    enabled: Boolean(shopId && customerId && measurementId),
  });
}

export function useMeasurementValuesForCopy(shopId: string | null, customerId: string | undefined, measurementId: string | null) {
  return useQuery({
    queryKey: measurementKeys.copy(shopId ?? '', customerId ?? '', measurementId ?? ''),
    queryFn: () => getMeasurementValuesForCopy(shopId ?? '', customerId ?? '', measurementId ?? ''),
    enabled: Boolean(shopId && customerId && measurementId),
  });
}

export function useCreateMeasurementVersion(shopId: string, customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { garmentTypeId: string; unit: MeasurementUnit; values: Record<string, unknown>; notes?: string | null }) =>
      createMeasurementVersion({ shopId, customerId, ...values }),
    onSuccess: (measurement) => {
      void queryClient.invalidateQueries({ queryKey: measurementKeys.customer(shopId, customerId) });
      void queryClient.invalidateQueries({ queryKey: measurementKeys.latest(shopId, customerId, measurement.garment_type_id) });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.measurementFields(shopId, measurement.garment_type_id) });
    },
  });
}
