import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GarmentFormValues, MeasurementFieldFormValues, StyleFieldFormValues } from './configurationSchemas';
import { configurationKeys } from './configurationQueryKeys';
import {
  archiveGarmentType,
  archiveMeasurementField,
  archiveStyleField,
  createGarmentType,
  createMeasurementField,
  createStyleField,
  getGarmentType,
  listGarmentTypes,
  listMeasurementFields,
  listStyleFields,
  restoreGarmentType,
  restoreMeasurementField,
  restoreStyleField,
  updateGarmentType,
  updateMeasurementField,
  updateStyleField,
} from './configurationService';

export function useGarmentTypes(shopId: string | null, includeArchived = false) {
  return useQuery({
    queryKey: configurationKeys.garments(shopId ?? '', includeArchived),
    queryFn: () => listGarmentTypes(shopId ?? '', includeArchived),
    enabled: Boolean(shopId),
  });
}

export function useGarmentType(shopId: string | null, garmentTypeId: string | undefined) {
  return useQuery({
    queryKey: configurationKeys.garment(shopId ?? '', garmentTypeId ?? ''),
    queryFn: () => getGarmentType(shopId ?? '', garmentTypeId ?? ''),
    enabled: Boolean(shopId && garmentTypeId),
  });
}

export function useMeasurementFields(shopId: string | null, garmentTypeId?: string, includeArchived = false) {
  return useQuery({
    queryKey: configurationKeys.measurementFields(shopId ?? '', garmentTypeId, includeArchived),
    queryFn: () => listMeasurementFields(shopId ?? '', garmentTypeId, includeArchived),
    enabled: Boolean(shopId),
  });
}

export function useStyleFields(shopId: string | null, garmentTypeId?: string, includeArchived = false) {
  return useQuery({
    queryKey: configurationKeys.styleFields(shopId ?? '', garmentTypeId, includeArchived),
    queryFn: () => listStyleFields(shopId ?? '', garmentTypeId, includeArchived),
    enabled: Boolean(shopId),
  });
}

export function useCreateGarmentType(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: GarmentFormValues) => createGarmentType(shopId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'garments'] });
    },
  });
}

export function useUpdateGarmentType(shopId: string, garmentTypeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: GarmentFormValues) => updateGarmentType(shopId, garmentTypeId, values),
    onSuccess: (garment) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'garments'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.garment(shopId, garment.id) });
    },
  });
}

export function useArchiveGarmentType(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (garmentTypeId: string) => archiveGarmentType(shopId, garmentTypeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'garments'] });
    },
  });
}

export function useRestoreGarmentType(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (garmentTypeId: string) => restoreGarmentType(shopId, garmentTypeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'garments'] });
    },
  });
}

export function useCreateMeasurementField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MeasurementFieldFormValues) => createMeasurementField(shopId, values),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'measurement-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.measurementFields(shopId, field.garment_type_id) });
    },
  });
}

export function useUpdateMeasurementField(shopId: string, fieldId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MeasurementFieldFormValues) => updateMeasurementField(shopId, fieldId, values),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'measurement-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.measurementFields(shopId, field.garment_type_id) });
    },
  });
}

export function useArchiveMeasurementField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => archiveMeasurementField(shopId, fieldId),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'measurement-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.measurementFields(shopId, field.garment_type_id) });
    },
  });
}

export function useRestoreMeasurementField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => restoreMeasurementField(shopId, fieldId),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'measurement-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.measurementFields(shopId, field.garment_type_id) });
    },
  });
}

export function useCreateStyleField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: StyleFieldFormValues) => createStyleField(shopId, values),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'style-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.styleFields(shopId, field.garment_type_id) });
    },
  });
}

export function useUpdateStyleField(shopId: string, fieldId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: StyleFieldFormValues) => updateStyleField(shopId, fieldId, values),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'style-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.styleFields(shopId, field.garment_type_id) });
    },
  });
}

export function useArchiveStyleField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => archiveStyleField(shopId, fieldId),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'style-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.styleFields(shopId, field.garment_type_id) });
    },
  });
}

export function useRestoreStyleField(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => restoreStyleField(shopId, fieldId),
    onSuccess: (field) => {
      void queryClient.invalidateQueries({ queryKey: [...configurationKeys.all, shopId, 'style-fields'] });
      void queryClient.invalidateQueries({ queryKey: configurationKeys.styleFields(shopId, field.garment_type_id) });
    },
  });
}
