export type Role = 'customer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  is_active: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
  sort_order: number;
  show_in_nav: number;
  show_on_home: number;
  nav_label: string;
  name_pt: string;
  nav_label_pt: string;
  product_count: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category_id: number | null;
  brand: string;
  price_pence: number;
  compare_pence: number;
  stock: number;
  short_desc: string;
  description: string;
  features: string;
  specs: string;
  name_pt: string;
  short_desc_pt: string;
  description_pt: string;
  features_pt: string;
  specs_pt: string;
  colours: string;
  options: string;
  is_featured: number;
  is_active: number;
  sold_count: number;
  created_at: string;
  updated_at: string;
}

/** The subset of product data shown on cards and listings. */
export interface CardProduct {
  id: number;
  name: string;
  name_pt: string;
  slug: string;
  brand: string;
  price_pence: number;
  compare_pence: number;
  stock: number;
  category_id: number | null;
  thumb: string | null;
  rating: number | null;
  review_count: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  path: string;
  thumb: string;
  sort_order: number;
}

export type OrderStatus = 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  email: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  notes: string;
  subtotal_pence: number;
  delivery_pence: number;
  total_pence: number;
  payment_method: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  tracking_number: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  name: string;
  variant: string;
  image: string;
  price_pence: number;
  qty: number;
}

export interface Address {
  id: number;
  user_id: number;
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  phone: string;
  is_default: number;
}

export type RepairStatus = 'new' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Repair {
  id: number;
  ref: string;
  user_id: number | null;
  device_type: string;
  brand: string;
  model: string;
  repair_type: string;
  full_name: string;
  phone: string;
  email: string;
  preferred_date: string;
  preferred_time: string;
  details: string;
  status: RepairStatus;
  admin_notes: string;
  quote_pence: number;
  created_at: string;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  phone: string;
  body: string;
  is_read: number;
  created_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number | null;
  author: string;
  rating: number;
  body: string;
  is_approved: number;
  created_at: string;
}

export interface Page {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  title_pt: string;
  subtitle_pt: string;
  body_pt: string;
  updated_at: string;
}

export interface CartEntry {
  productId: number;
  colour: string;
  option: string;
  qty: number;
}

export interface Flash {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface SessionData {
  cart?: CartEntry[];
  recentOrders?: string[];
  flash?: Flash;
}

/** Shape returned by Server Actions that power forms via useActionState. */
export interface FormState {
  ok?: boolean;
  errors?: string[];
  message?: string;
  /** Changes on every submission so client effects (toasts) re-fire. */
  at?: number;
  data?: Record<string, unknown>;
}
