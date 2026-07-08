export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ShopRole = 'owner' | 'manager' | 'staff' | 'cutter' | 'tailor' | 'viewer';
export type MeasurementUnit = 'inch' | 'cm';
export type MeasurementFieldType = 'number' | 'text' | 'textarea' | 'select' | 'checkbox';
export type StyleFieldType = 'select' | 'multiselect' | 'text' | 'number' | 'checkbox' | 'textarea';
export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'ready' | 'partially_delivered' | 'delivered' | 'cancelled';
export type ProductionStatus =
  | 'order_received'
  | 'measurement_confirmed'
  | 'cutting'
  | 'stitching'
  | 'finishing'
  | 'ironing'
  | 'quality_check'
  | 'ready'
  | 'delivered'
  | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_banking' | 'other';
export type PaymentStatus = 'completed' | 'voided';

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamp = string;
type Uuid = string;

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        { id: Uuid; full_name: string | null; phone: string | null; created_at: Timestamp; updated_at: Timestamp },
        { id: Uuid; full_name?: string | null; phone?: string | null; created_at?: Timestamp; updated_at?: Timestamp },
        { id?: Uuid; full_name?: string | null; phone?: string | null; created_at?: Timestamp; updated_at?: Timestamp }
      >;
      shops: TableDefinition<
        {
          id: Uuid;
          name: string;
          phone: string | null;
          address: string | null;
          logo_url: string | null;
          timezone: string;
          currency: string;
          default_measurement_unit: MeasurementUnit;
          created_by: Uuid;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        {
          id?: Uuid;
          name: string;
          phone?: string | null;
          address?: string | null;
          logo_url?: string | null;
          timezone?: string;
          currency?: string;
          default_measurement_unit?: MeasurementUnit;
          created_by: Uuid;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        },
        {
          id?: Uuid;
          name?: string;
          phone?: string | null;
          address?: string | null;
          logo_url?: string | null;
          timezone?: string;
          currency?: string;
          default_measurement_unit?: MeasurementUnit;
          created_by?: Uuid;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        }
      >;
      shop_members: TableDefinition<
        { shop_id: Uuid; user_id: Uuid; role: ShopRole; is_active: boolean; created_at: Timestamp; updated_at: Timestamp },
        { shop_id: Uuid; user_id: Uuid; role?: ShopRole; is_active?: boolean; created_at?: Timestamp; updated_at?: Timestamp },
        { shop_id?: Uuid; user_id?: Uuid; role?: ShopRole; is_active?: boolean; created_at?: Timestamp; updated_at?: Timestamp }
      >;
      shop_counters: TableDefinition<
        { shop_id: Uuid; customer_next_number: number; order_next_number: number; created_at: Timestamp; updated_at: Timestamp },
        { shop_id: Uuid; customer_next_number?: number; order_next_number?: number; created_at?: Timestamp; updated_at?: Timestamp },
        { shop_id?: Uuid; customer_next_number?: number; order_next_number?: number; created_at?: Timestamp; updated_at?: Timestamp }
      >;
      garment_types: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          name: string;
          name_bn: string | null;
          code: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        {
          id?: Uuid;
          shop_id: Uuid;
          name: string;
          name_bn?: string | null;
          code: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        },
        {
          id?: Uuid;
          shop_id?: Uuid;
          name?: string;
          name_bn?: string | null;
          code?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        }
      >;
      measurement_fields: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          garment_type_id: Uuid;
          label: string;
          label_bn: string | null;
          field_key: string;
          field_type: MeasurementFieldType;
          unit: MeasurementUnit | null;
          placeholder: string | null;
          help_text: string | null;
          minimum_value: number | null;
          maximum_value: number | null;
          step_value: number;
          is_required: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        {
          id?: Uuid;
          shop_id: Uuid;
          garment_type_id: Uuid;
          label: string;
          label_bn?: string | null;
          field_key: string;
          field_type?: MeasurementFieldType;
          unit?: MeasurementUnit | null;
          placeholder?: string | null;
          help_text?: string | null;
          minimum_value?: number | null;
          maximum_value?: number | null;
          step_value?: number;
          is_required?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        },
        Record<string, Json | undefined>
      >;
      style_fields: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          garment_type_id: Uuid;
          label: string;
          label_bn: string | null;
          field_key: string;
          field_type: StyleFieldType;
          options: Json;
          is_required: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        {
          id?: Uuid;
          shop_id: Uuid;
          garment_type_id: Uuid;
          label: string;
          label_bn?: string | null;
          field_key: string;
          field_type?: StyleFieldType;
          options?: Json;
          is_required?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        },
        Record<string, Json | undefined>
      >;
      customers: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          customer_code: string;
          name: string;
          normalized_name: string;
          phone: string | null;
          normalized_phone: string | null;
          alternative_phone: string | null;
          address: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: Uuid | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        {
          id?: Uuid;
          shop_id: Uuid;
          customer_code: string;
          name: string;
          normalized_name?: string;
          phone?: string | null;
          normalized_phone?: string | null;
          alternative_phone?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: Uuid | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          deleted_at?: Timestamp | null;
        },
        Record<string, Json | undefined>
      >;
      measurement_sets: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          customer_id: Uuid;
          garment_type_id: Uuid;
          version_number: number;
          unit: MeasurementUnit;
          values: Json;
          notes: string | null;
          measured_at: Timestamp;
          measured_by: Uuid | null;
          is_current: boolean;
          created_at: Timestamp;
        },
        {
          id?: Uuid;
          shop_id: Uuid;
          customer_id: Uuid;
          garment_type_id: Uuid;
          version_number: number;
          unit?: MeasurementUnit;
          values: Json;
          notes?: string | null;
          measured_at?: Timestamp;
          measured_by?: Uuid | null;
          is_current?: boolean;
          created_at?: Timestamp;
        },
        { notes?: string | null; is_current?: boolean }
      >;
      orders: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          order_number: string;
          customer_id: Uuid;
          order_date: string;
          trial_date: string | null;
          delivery_date: string | null;
          priority: OrderPriority;
          overall_status: OrderStatus;
          subtotal: number;
          discount_amount: number;
          total_amount: number;
          notes: string | null;
          created_by: Uuid | null;
          delivered_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        },
        Record<string, Json | undefined>,
        Record<string, Json | undefined>
      >;
      order_items: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          order_id: Uuid;
          garment_type_id: Uuid;
          garment_name_snapshot: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          measurement_set_id: Uuid | null;
          measurement_snapshot: Json;
          style_snapshot: Json;
          special_instructions: string | null;
          assigned_to: Uuid | null;
          production_status: ProductionStatus;
          item_delivery_date: string | null;
          design_reference_url: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        },
        Record<string, Json | undefined>,
        Record<string, Json | undefined>
      >;
      payments: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          order_id: Uuid;
          amount: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          reference: string | null;
          notes: string | null;
          paid_at: Timestamp;
          received_by: Uuid | null;
          voided_at: Timestamp | null;
          voided_by: Uuid | null;
          void_reason: string | null;
          created_at: Timestamp;
        },
        Record<string, Json | undefined>,
        Record<string, Json | undefined>
      >;
      order_status_history: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          order_id: Uuid;
          order_item_id: Uuid | null;
          previous_status: string | null;
          new_status: string;
          note: string | null;
          changed_by: Uuid | null;
          changed_at: Timestamp;
        },
        Record<string, Json | undefined>,
        never
      >;
      audit_logs: TableDefinition<
        {
          id: Uuid;
          shop_id: Uuid;
          user_id: Uuid | null;
          action: string;
          entity_type: string;
          entity_id: Uuid | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: Timestamp;
        },
        never,
        never
      >;
    };
    Views: Record<string, never>;
    Enums: {
      shop_role: ShopRole;
      measurement_unit: MeasurementUnit;
      measurement_field_type: MeasurementFieldType;
      style_field_type: StyleFieldType;
      order_priority: OrderPriority;
      order_status: OrderStatus;
      production_status: ProductionStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    Functions: {
      create_shop_with_owner: {
        Args: {
          owner_full_name: string;
          owner_phone: string | null;
          shop_name: string;
          shop_phone?: string | null;
          shop_address?: string | null;
          shop_logo_url?: string | null;
        };
        Returns: Uuid;
      };
      create_measurement_version: {
        Args: {
          target_shop_id: Uuid;
          target_customer_id: Uuid;
          target_garment_type_id: Uuid;
          target_unit: MeasurementUnit;
          measurement_values: Json;
          measurement_notes?: string | null;
        };
        Returns: Database['public']['Tables']['measurement_sets']['Row'];
      };
      create_order_with_items: {
        Args: { target_shop_id: Uuid; target_customer_id: Uuid; order_payload: Json };
        Returns: Json;
      };
      record_order_payment: {
        Args: {
          target_shop_id: Uuid;
          target_order_id: Uuid;
          payment_amount: number;
          target_payment_method: PaymentMethod;
          payment_reference?: string | null;
          payment_notes?: string | null;
          allow_overpayment?: boolean;
        };
        Returns: Json;
      };
      change_order_item_status: {
        Args: { target_shop_id: Uuid; target_order_item_id: Uuid; target_status: ProductionStatus; status_note?: string | null };
        Returns: Database['public']['Tables']['order_items']['Row'];
      };
      confirm_order_delivery: {
        Args: { target_shop_id: Uuid; target_order_item_id: Uuid; delivery_note?: string | null };
        Returns: Database['public']['Tables']['order_items']['Row'];
      };
      void_order_payment: {
        Args: { target_shop_id: Uuid; target_payment_id: Uuid; void_reason: string };
        Returns: undefined;
      };
      get_dashboard_metrics: {
        Args: { target_shop_id: Uuid };
        Returns: Json;
      };
      get_tailor_dashboard_metrics: {
        Args: { target_shop_id: Uuid };
        Returns: Json;
      };
      get_current_user_shop_memberships: {
        Args: Record<PropertyKey, never>;
        Returns: {
          shop_id: Uuid;
          user_id: Uuid;
          role: ShopRole;
          is_active: boolean;
          shop_name: string;
          timezone: string;
          currency: string;
          default_measurement_unit: MeasurementUnit;
        }[];
      };
    };
    CompositeTypes: Record<string, never>;
  };
};


