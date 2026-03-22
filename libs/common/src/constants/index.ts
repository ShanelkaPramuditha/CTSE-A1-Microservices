// ============================================
// Shared Constants - TCP Service Tokens & Patterns
// ============================================

// --- Client Proxy Injection Tokens ---
export const USER_SERVICE = 'USER_SERVICE';
export const PRODUCT_SERVICE = 'PRODUCT_SERVICE';
export const ORDER_SERVICE = 'ORDER_SERVICE';
export const PAYMENT_SERVICE = 'PAYMENT_SERVICE';
export const CART_SERVICE = 'CART_SERVICE';

// --- User Service TCP Patterns ---
export const USER_PATTERNS = {
  REGISTER: 'register_user',
  LOGIN: 'login_user',
  REFRESH_SESSION: 'refresh_user_session',
  LOGOUT_SESSION: 'logout_user_session',
  GET_PROFILE: 'get_user_profile',
  UPDATE_PROFILE: 'update_user_profile',
  CHANGE_PASSWORD: 'change_password',
  GET_DASHBOARD_STATS: 'get_user_dashboard_stats',
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
  GET_BY_USER: 'get_orders_by_user',
  UPDATE_STATUS: 'update_order_status',
  /** Checkout: reads the user's cart, validates stock, places order, clears cart, processes payment */
  CHECKOUT: 'checkout_order',
  /**
   * Batch: for each productId, count distinct orders and sum ordered quantities
   * (non-cancelled / non-failed pipeline statuses — see order service).
   */
  GET_PRODUCTS_ORDER_STATS: 'get_products_order_stats',
} as const;

// --- Payment Service TCP Patterns ---
export const PAYMENT_PATTERNS = {
  PROCESS: 'process_payment',
  GET_BY_USER: 'get_payments_by_user',
} as const;

// --- Cart Service TCP Patterns ---
export const CART_PATTERNS = {
  GET_CART: 'get_cart',
  ADD_ITEM: 'add_cart_item',
  UPDATE_ITEM: 'update_cart_item',
  REMOVE_ITEM: 'remove_cart_item',
  CLEAR_CART: 'clear_cart',
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
