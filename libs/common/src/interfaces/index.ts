// ============================================
// Shared Interfaces
// ============================================

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  password?: string;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProduct {
  _id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface IOrder {
  _id?: string;
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: string;
  paymentId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayment {
  _id?: string;
  orderId: string;
  amount: number;
  status: string;
  transactionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface IStockValidation {
  productId: string;
  quantity: number;
}

export interface IStockValidationResult {
  valid: boolean;
  productId: string;
  productName?: string;
  availableStock?: number;
  requestedQuantity: number;
  price?: number;
}

export interface ICartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ICart {
  _id?: string;
  userId: string;
  items: ICartItem[];
  totalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
