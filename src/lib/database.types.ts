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
          active: boolean;
          created_at: string;
        };
        Insert: {
          [key: string]: unknown;
          id?: number;
          name: string;
          description?: string | null;
          base_price: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          name?: string;
          description?: string | null;
          base_price?: number;
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
          amount: number;
          commission_amount: number;
          master_amount: number;
          status?: PaymentStatus;
          created_at?: string;
        };
        Update: {
          [key: string]: unknown;
          stripe_payment_intent_id?: string | null;
          amount?: number;
          commission_amount?: number;
          master_amount?: number;
          status?: PaymentStatus;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
