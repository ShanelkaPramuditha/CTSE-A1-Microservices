// ============================================
// Shared Constants - TCP Service Tokens & Patterns
// ============================================

// --- Client Proxy Injection Tokens ---
export const USER_SERVICE = 'USER_SERVICE';
export const PRODUCT_SERVICE = 'PRODUCT_SERVICE';
export const ORDER_SERVICE = 'ORDER_SERVICE';
export const PAYMENT_SERVICE = 'PAYMENT_SERVICE';

// --- User Service TCP Patterns ---
export const USER_PATTERNS = {
  REGISTER: 'register_user',
  LOGIN: 'login_user',
  GET_PROFILE: 'get_user_profile',
  UPDATE_PROFILE: 'update_user_profile',
} as const;

// --- Product Service TCP Patterns ---
export const PRODUCT_PATTERNS = {
  CREATE: 'create_product',
  GET_ALL: 'get_products',
  GET_BY_ID: 'get_product_by_id',
  VALIDATE_STOCK: 'validate_stock',
} as const;

// --- Order Service TCP Patterns ---
export const ORDER_PATTERNS = {
  CREATE: 'create_order',
  GET_ALL: 'get_orders',
  UPDATE_STATUS: 'update_order_status',
} as const;

// --- Payment Service TCP Patterns ---
export const PAYMENT_PATTERNS = {
  PROCESS: 'process_payment',
} as const;

// --- Order Statuses ---
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED',
}

// --- Payment Statuses ---
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
