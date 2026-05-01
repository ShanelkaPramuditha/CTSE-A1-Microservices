import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ORDER_PATTERNS,
  ORDER_SERVICE,
  OrderStatus,
  PAYMENT_PATTERNS,
  PAYMENT_SERVICE,
  PaymentStatus,
  USER_SERVICE,
  USER_PATTERNS,
} from '@app/common/constants';

type DashboardOrderItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
};

type DashboardOrder = {
  _id?: string;
  userId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string | Date;
  items?: DashboardOrderItem[];
};

type DashboardPayment = {
  _id?: string;
  userId?: string;
  amount?: number;
  status?: string;
  createdAt?: string | Date;
};

const DASHBOARD_RANGES = ['7d', '30d', '90d', '365d', 'all'] as const;
type DashboardRange = (typeof DASHBOARD_RANGES)[number];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    @Inject(ORDER_SERVICE) private readonly orderClient: ClientProxy,
    @Inject(PAYMENT_SERVICE) private readonly paymentClient: ClientProxy,
  ) {}

  private parseRange(range?: string): DashboardRange {
    if (!range) {
      return '30d';
    }

    if ((DASHBOARD_RANGES as readonly string[]).includes(range)) {
      return range as DashboardRange;
    }

    return '30d';
  }

  async getDashboardStats(userId: string, range?: string) {
    const selectedRange = this.parseRange(range);
    const profile = await firstValueFrom(
      this.userClient.send(USER_PATTERNS.GET_PROFILE, {
        userId,
      }),
    );

    let orderServiceConnected = true;
    let paymentServiceConnected = true;

    let orders: DashboardOrder[] = [];
    let payments: DashboardPayment[] = [];

    try {
      orders = await firstValueFrom(
        this.orderClient.send<DashboardOrder[]>(ORDER_PATTERNS.GET_BY_USER, {
          userId,
        }),
      );
    } catch (error) {
      orderServiceConnected = false;
      this.logger.warn(
        `Order service unavailable for dashboard stats (userId=${userId}): ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    try {
      payments = await firstValueFrom(
        this.paymentClient.send<DashboardPayment[]>(
          PAYMENT_PATTERNS.GET_BY_USER,
          {
            userId,
          },
        ),
      );
    } catch (error) {
      paymentServiceConnected = false;
      this.logger.warn(
        `Payment service unavailable for dashboard stats (userId=${userId}): ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    const safeOrders = Array.isArray(orders)
      ? orders.filter((order) => !order.userId || order.userId === userId)
      : [];
    const safePayments = Array.isArray(payments)
      ? payments.filter(
          (payment) => !payment.userId || payment.userId === userId,
        )
      : [];

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const yearAgo = now - 365 * 24 * 60 * 60 * 1000;

    const rangeStartTime =
      selectedRange === '7d'
        ? weekAgo
        : selectedRange === '30d'
          ? monthAgo
          : selectedRange === '90d'
            ? ninetyDaysAgo
            : selectedRange === '365d'
              ? yearAgo
              : null;

    const inRange = (value?: string | Date) => {
      if (rangeStartTime === null) {
        return true;
      }
      const createdAt = new Date(value ?? 0).getTime();
      return createdAt >= rangeStartTime;
    };

    const filteredOrders = safeOrders.filter((order) =>
      inRange(order.createdAt),
    );
    const filteredPayments = safePayments.filter((payment) =>
      inRange(payment.createdAt),
    );

    const totalOrders = filteredOrders.length;
    const totalSpent = filteredOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const weeklyOrders = filteredOrders.filter((order) => {
      const createdAt = new Date(order.createdAt ?? 0).getTime();
      return createdAt >= weekAgo;
    });

    const monthlyOrders = filteredOrders.filter((order) => {
      const createdAt = new Date(order.createdAt ?? 0).getTime();
      return createdAt >= monthAgo;
    });

    const weeklyOrderAmount = weeklyOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const monthlyOrderAmount = monthlyOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const totalItemsOrdered = filteredOrders.reduce(
      (sum, order) =>
        sum +
        (Array.isArray(order.items)
          ? order.items.reduce(
              (itemSum, item) => itemSum + Number(item.quantity ?? 0),
              0,
            )
          : 0),
      0,
    );

    const paidOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.PAID,
    ).length;
    const pendingOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.PENDING,
    ).length;
    const failedOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.PAYMENT_FAILED,
    ).length;
    const confirmedOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.CONFIRMED,
    ).length;
    const deliveredOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    ).length;
    const cancelledOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.CANCELLED,
    ).length;

    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const weeklyAverageOrderValue =
      weeklyOrders.length > 0 ? weeklyOrderAmount / weeklyOrders.length : 0;
    const monthlyAverageOrderValue =
      monthlyOrders.length > 0 ? monthlyOrderAmount / monthlyOrders.length : 0;

    const sortedOrders = [...filteredOrders].sort((a, b) => {
      const left = new Date(a.createdAt ?? 0).getTime();
      const right = new Date(b.createdAt ?? 0).getTime();
      return right - left;
    });

    const lastOrderDate =
      sortedOrders.length > 0 && sortedOrders[0].createdAt
        ? new Date(sortedOrders[0].createdAt).toISOString()
        : null;

    const successfulPayments = filteredPayments.filter(
      (payment) => payment.status === PaymentStatus.SUCCESS,
    ).length;
    const failedPayments = filteredPayments.filter(
      (payment) => payment.status === PaymentStatus.FAILED,
    ).length;

    const successfulPaymentAmount = filteredPayments
      .filter((payment) => payment.status === PaymentStatus.SUCCESS)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const failedPaymentAmount = filteredPayments
      .filter((payment) => payment.status === PaymentStatus.FAILED)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const totalPaymentAttempts = successfulPayments + failedPayments;
    const paymentSuccessRate =
      totalPaymentAttempts > 0
        ? (successfulPayments / totalPaymentAttempts) * 100
        : 0;

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        totalAmount: number;
      }
    >();

    filteredOrders.forEach((order) => {
      if (!Array.isArray(order.items)) {
        return;
      }

      order.items.forEach((item) => {
        const productId = item.productId ?? 'unknown-product';
        const productName = item.productName ?? 'Unknown Product';
        const quantity = Number(item.quantity ?? 0);
        const price = Number(item.price ?? 0);

        const existing = productMap.get(productId);
        if (existing) {
          existing.quantity += quantity;
          existing.totalAmount += quantity * price;
          return;
        }

        productMap.set(productId, {
          productId,
          productName,
          quantity,
          totalAmount: quantity * price,
        });
      });
    });

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.quantity - a.quantity || b.totalAmount - a.totalAmount)
      .slice(0, 5);

    return {
      profile,
      integration: {
        orderServiceConnected,
        paymentServiceConnected,
      },
      metrics: {
        totalOrders,
        totalSpent,
        paidOrders,
        pendingOrders,
        failedOrders,
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        totalItemsOrdered,
        averageOrderValue,
        weeklyAverageOrderValue,
        monthlyAverageOrderValue,
        weeklyOrderCount: weeklyOrders.length,
        monthlyOrderCount: monthlyOrders.length,
        lastOrderDate,
        successfulPayments,
        failedPayments,
        successfulPaymentAmount,
        failedPaymentAmount,
        paymentSuccessRate,
      },
      topProducts,
    };
  }
}
