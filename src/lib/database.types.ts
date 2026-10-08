export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "master" | "admin";
export type OrderStatus =
  | "new"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export type Database = {
  public: {
    Tables: {
      ai_estimates: {
        Row: AiEstimateRow;
        Insert: never;
        Update: { status?: "pending" | "completed" | "failed"; result?: Json; model?: string };
        Relationships: [];
      };
      order_quotes: ReadTable<Quote>;
      conversations: ReadTable<Conversation>;
      messages: ReadTable<Message>;
      conversation_reads: ReadTable<{ conversation_id: string; profile_id: string; last_message_id: number }>;
      profiles: {
        Row: {
          [key: string]: unknown;
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          role: UserRole;
          city: string | null;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          role?: UserRole;
          city?: string | null;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          full_name?: string;
          email?: string;
          phone?: string | null;
          role?: UserRole;
          city?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          [key: string]: unknown;
          id: number;
          name: string;
          description: string | null;
          base_price: number;
          estimate_max: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: number;
          name: string;
          description?: string | null;
          base_price: number;
          estimate_max?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          name?: string;
          description?: string | null;
          base_price?: number;
          estimate_max?: number | null;
          active?: boolean;
        };
        Relationships: [];
      };
      masters: {
        Row: {
          [key: string]: unknown;
          id: number;
          profile_id: string;
          description: string | null;
          hourly_rate: number | null;
          verified: boolean;
          available: boolean;
          rating_avg: number;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: number;
          profile_id: string;
          description?: string | null;
          hourly_rate?: number | null;
          verified?: boolean;
          available?: boolean;
          rating_avg?: number;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          description?: string | null;
          hourly_rate?: number | null;
          verified?: boolean;
          available?: boolean;
          rating_avg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "masters_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          [key: string]: unknown;
          id: string;
          order_number: string;
          customer_id: string;
          master_id: string | null;
          service_id: number;
          problem_description: string;
          address: string;
          city: string;
          preferred_datetime: string | null;
          status: OrderStatus;
          estimated_price: number | null;
          estimated_price_max: number | null;
          ai_estimate_id: string | null;
          client_request_id: string | null;
          final_price: number | null;
          commission_amount: number | null;
          stripe_payment_status: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          [key: string]: unknown;
          id?: string;
          order_number: string;
          customer_id: string;
          master_id?: string | null;
          service_id: number;
          problem_description: string;
          address: string;
          city: string;
          preferred_datetime?: string | null;
          status?: OrderStatus;
          estimated_price?: number | null;
          estimated_price_max?: number | null;
          final_price?: number | null;
          commission_amount?: number | null;
          stripe_payment_status?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          [key: string]: unknown;
          master_id?: string | null;
          problem_description?: string;
          address?: string;
          city?: string;
          preferred_datetime?: string | null;
          status?: OrderStatus;
          estimated_price?: number | null;
          estimated_price_max?: number | null;
          final_price?: number | null;
          commission_amount?: number | null;
          stripe_payment_status?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          }
        ];
      };
      order_photos: {
        Row: {
          [key: string]: unknown;
          id: string;
          order_id: string;
          photo_url: string;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: string;
          order_id: string;
          photo_url: string;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          photo_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      ratings: {
        Row: {
          [key: string]: unknown;
          id: string;
          order_id: string;
          customer_id: string;
          master_id: string;
          stars: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: string;
          order_id: string;
          customer_id: string;
          master_id: string;
          stars: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          stars?: number;
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          [key: string]: unknown;
          id: string;
          order_id: string;
          stripe_payment_intent_id: string | null;
          quote_id: string | null;
          stripe_checkout_session_id: string | null;
          checkout_attempt: number;
          attempt_started_at: string | null;
          refunded_amount: number;
          amount: number;
          commission_amount: number;
          master_amount: number;
          status: PaymentStatus;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: string;
          order_id: string;
          stripe_payment_intent_id?: string | null;
          quote_id?: string | null;
          stripe_checkout_session_id?: string | null;
          checkout_attempt?: number;
          attempt_started_at?: string | null;
          refunded_amount?: number;
          amount: number;
          commission_amount: number;
          master_amount: number;
          status?: PaymentStatus;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          stripe_payment_intent_id?: string | null;
          quote_id?: string | null;
          stripe_checkout_session_id?: string | null;
          checkout_attempt?: number;
          attempt_started_at?: string | null;
          refunded_amount?: number;
          amount?: number;
          commission_amount?: number;
          master_amount?: number;
          status?: PaymentStatus;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_ai_estimate: { Args: { p_service: number; p_description: string; p_city: string; p_fingerprint: string; p_photo_count: number }; Returns: AiEstimateRow };
      create_order_with_ai: { Args: { p_service: number; p_description: string; p_address: string; p_city: string; p_preferred?: string | null; p_request?: string | null; p_estimate?: string | null }; Returns: string };
      attach_order_photo: { Args: { p_order: string; p_path: string }; Returns: undefined };
      create_order: { Args: { p_service: number; p_description: string; p_address: string; p_city: string; p_preferred?: string | null; p_request?: string | null }; Returns: string };
      assign_master: { Args: { p_order: string; p_master: string }; Returns: undefined };
      verify_master: { Args: { p_master: string; p_verified: boolean }; Returns: undefined };
      respond_to_order: { Args: { p_order: string; p_accept: boolean }; Returns: undefined };
      propose_quote: { Args: { p_order: string; p_scope: string; p_labor: number; p_materials: number; p_travel: number }; Returns: string };
      withdraw_quote: { Args: { p_quote: string }; Returns: undefined };
      respond_to_quote: { Args: { p_quote: string; p_accept: boolean; p_note?: string }; Returns: undefined };
      cancel_order: { Args: { p_order: string }; Returns: undefined };
      complete_order: { Args: { p_order: string }; Returns: undefined };
      prepare_checkout: { Args: { p_payment: string }; Returns: Database["public"]["Tables"]["payments"]["Row"] };
      attach_checkout: { Args: { p_payment: string; p_attempt: number; p_session: string }; Returns: undefined };
      reset_checkout: { Args: { p_payment: string; p_attempt: number }; Returns: undefined };
      settle_checkout: { Args: { p_payment: string; p_attempt: number; p_session: string; p_intent: string; p_amount: number; p_currency: string }; Returns: string };
      record_refund: { Args: { p_intent: string; p_refunded: number }; Returns: undefined };
      send_message: { Args: { p_conversation: string; p_body: string; p_client: string }; Returns: number };
      create_support: { Args: { p_subject: string; p_body: string; p_client: string; p_order?: string | null }; Returns: string };
      mark_conversation_read: { Args: { p_conversation: string; p_message: number }; Returns: undefined };
      set_support_status: { Args: { p_conversation: string; p_closed: boolean }; Returns: undefined };
      unread_message_count: { Args: Record<string, never>; Returns: number };
      message_inbox: { Args: Record<string, never>; Returns: InboxItem[] };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};


type ReadTable<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
export type AiEstimateRow = {
  id: string; customer_id: string; service_id: number; problem_description: string; city: string;
  fingerprint: string; photo_count: number; status: "pending" | "completed" | "failed";
  result: Json | null; model: string | null; created_at: string;
};
export type Quote = {
  id: string; order_id: string; created_by: string; kind: "initial" | "extra";
  scope: string; labor_amount: number; materials_amount: number; travel_amount: number; total_amount: number;
  status: "proposed" | "accepted" | "rejected" | "superseded";
  response_note: string | null; accepted_by: string | null; responded_at: string | null; created_at: string;
};
export type Conversation = {
  id: string; kind: "order" | "support"; order_id: string | null; owner_id: string | null;
  subject: string; status: "open" | "closed"; created_at: string; updated_at: string;
};
export type Message = {
  id: number; conversation_id: string; sender_id: string; sender_name: string; sender_role: UserRole;
  body: string; client_id: string; is_system: boolean; created_at: string;
};
export type InboxItem = Pick<Conversation, "id" | "kind" | "order_id" | "subject" | "status" | "updated_at"> & {
  last_body: string | null; unread_count: number;
};
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
