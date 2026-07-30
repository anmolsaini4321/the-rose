export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bouquet_likes: {
        Row: {
          bouquet_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          bouquet_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          bouquet_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bouquet_likes_bouquet_id_fkey";
            columns: ["bouquet_id"];
            isOneToOne: false;
            referencedRelation: "bouquets";
            referencedColumns: ["id"];
          },
        ];
      };
      bouquets: {
        Row: {
          accessories: Json;
          created_at: string;
          fillers: Json;
          flowers: Json;
          id: string;
          is_public: boolean;
          likes_count: number;
          message: string | null;
          ribbon_color: string;
          ribbon_material: string;
          title: string;
          total_price: number;
          updated_at: string;
          user_id: string;
          wrapping: string;
        };
        Insert: {
          accessories?: Json;
          created_at?: string;
          fillers?: Json;
          flowers?: Json;
          id?: string;
          is_public?: boolean;
          likes_count?: number;
          message?: string | null;
          ribbon_color?: string;
          ribbon_material?: string;
          title?: string;
          total_price?: number;
          updated_at?: string;
          user_id: string;
          wrapping?: string;
        };
        Update: {
          accessories?: Json;
          created_at?: string;
          fillers?: Json;
          flowers?: Json;
          id?: string;
          is_public?: boolean;
          likes_count?: number;
          message?: string | null;
          ribbon_color?: string;
          ribbon_material?: string;
          title?: string;
          total_price?: number;
          updated_at?: string;
          user_id?: string;
          wrapping?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "super_admin" | "admin" | "user";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "super_admin" | "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "super_admin" | "admin" | "user";
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          short_description: string | null;
          price: number;
          original_price: number | null;
          flowers_included: string[];
          category: string;
          tags: string[];
          images: string[];
          thumbnail: string | null;
          is_published: boolean;
          is_featured: boolean;
          stock_count: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          meta_title: string | null;
          meta_description: string | null;
          average_rating: number;
          review_count: number;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          short_description?: string | null;
          price: number;
          original_price?: number | null;
          flowers_included?: string[];
          category?: string;
          tags?: string[];
          images?: string[];
          thumbnail?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          stock_count?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          average_rating?: number;
          review_count?: number;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string;
          short_description?: string | null;
          price?: number;
          original_price?: number | null;
          flowers_included?: string[];
          category?: string;
          tags?: string[];
          images?: string[];
          thumbnail?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          stock_count?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          average_rating?: number;
          review_count?: number;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          body: string;
          is_approved: boolean;
          is_removed: boolean;
          removed_by: string | null;
          removed_reason: string | null;
          created_at: string;
          updated_at: string;
          profiles?: { display_name: string | null; avatar_url: string | null } | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          body: string;
          is_approved?: boolean;
          is_removed?: boolean;
          removed_by?: string | null;
          removed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          title?: string | null;
          body?: string;
          is_approved?: boolean;
          is_removed?: boolean;
          removed_by?: string | null;
          removed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status:
            "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
          total_amount: number;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_address: string;
          shipping_city: string;
          shipping_pincode: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          profiles?: { display_name: string | null } | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?:
            "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
          total_amount: number;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_address: string;
          shipping_city: string;
          shipping_pincode: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?:
            "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
          total_amount?: number;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          shipping_name?: string;
          shipping_phone?: string;
          shipping_address?: string;
          shipping_city?: string;
          shipping_pincode?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
          products?: { title: string; thumbnail: string | null } | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_to_cart_secure: {
        Args: {
          p_product_id: string;
          p_quantity: number;
        };
        Returns: boolean;
      };
      verify_payment: {
        Args: {
          p_order_id: string;
          p_razorpay_order_id: string;
          p_razorpay_payment_id: string;
          p_razorpay_signature: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
