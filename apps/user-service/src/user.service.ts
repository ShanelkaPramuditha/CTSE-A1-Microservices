// ============================================
// User Service - Business Logic
// ============================================
import * as crypto from 'crypto';
import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User, UserDocument } from './schemas/user.schema';
import {
  RegisterUserDto,
  LoginUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from '@app/common/dto';
import { IJwtPayload, UserRole } from '@app/common/interfaces';
import {
  ORDER_PATTERNS,
  ORDER_SERVICE,
  PAYMENT_PATTERNS,
  PAYMENT_SERVICE,
  OrderStatus,
  PaymentStatus,
} from '@app/common/constants';

type UserOrder = {
  _id?: string;
  userId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string | Date;
  items?: unknown[];
};

type UserOrderItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
};

type UserPayment = {
  _id?: string;
  amount?: number;
  status?: string;
  createdAt?: string | Date;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRATION = '7d';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    @Inject(ORDER_SERVICE) private readonly orderClient: ClientProxy,
    @Inject(PAYMENT_SERVICE) private readonly paymentClient: ClientProxy,
  ) {}

  /**
   * Helper to generate Gravatar URL based on email
   */
  private createGravatarUrl(email: string): string {
    const hash = crypto
      .createHash('md5')
      .update(email.trim().toLowerCase())
      .digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  private buildJwtPayload(user: UserDocument): IJwtPayload {
    return {
      sub: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };
  }

  private buildUserResponse(user: UserDocument) {
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueSessionTokens(user: UserDocument) {
    const payload = this.buildJwtPayload(user);
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.REFRESH_TOKEN_EXPIRATION,
    });

    user.refreshTokenHash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return { accessToken, refreshToken };
  }

  private async clearSession(user: UserDocument) {
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();
  }

  /**
   * Register a new user with hashed password
   */
  async register(registerUserDto: RegisterUserDto) {
    const { email, name, password, role } = registerUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new RpcException(
        new ConflictException('User with this email already exists'),
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = new this.userModel({
      email,
      name,
      password: hashedPassword,
      role: role || UserRole.USER,
      avatar: this.createGravatarUrl(email),
    });

    const savedUser = await user.save();
    this.logger.log(`User registered successfully: ${savedUser.email}`);

    return this.buildUserResponse(savedUser);
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    // Find user by email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    // Generate JWT
    const { accessToken, refreshToken } = await this.issueSessionTokens(user);

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
    };
  }

  async refreshSession(refreshToken: string) {
    const payload =
      await this.jwtService.verifyAsync<IJwtPayload>(refreshToken);

    if (!payload.sub || !payload.email || !payload.role) {
      throw new RpcException(
        new UnauthorizedException('Invalid session token'),
      );
    }

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user || !user.refreshTokenHash) {
      throw new RpcException(new UnauthorizedException('Session expired'));
    }

    const isTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isTokenValid) {
      throw new RpcException(new UnauthorizedException('Session expired'));
    }

    const { accessToken, refreshToken: nextRefreshToken } =
      await this.issueSessionTokens(user);

    this.logger.log(`User session refreshed: ${user.email}`);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: this.buildUserResponse(user),
    };
  }

  async logout(refreshToken: string) {
    try {
      const payload =
        await this.jwtService.verifyAsync<IJwtPayload>(refreshToken);
      if (payload?.sub) {
        const user = await this.userModel.findById(payload.sub).exec();
        if (user && user.refreshTokenHash) {
          const isTokenValid = await bcrypt.compare(
            refreshToken,
            user.refreshTokenHash,
          );
          if (isTokenValid) {
            await this.clearSession(user);
          }
        }
      }
    } catch {
      // Logout is idempotent; invalid or expired tokens still clear client cookies.
    }

    this.logger.log('User session logged out');
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get user profile by ID (excludes password)
   */
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();

    if (!user) {
      throw new RpcException(new NotFoundException('User not found'));
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new RpcException(new NotFoundException('User not found'));
    }

    // If email is provided, verify uniqueness and update gravatar
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel
        .findOne({ email: updateUserDto.email })
        .exec();
      if (existingUser) {
        throw new RpcException(new ConflictException('Email already in use'));
      }
      user.email = updateUserDto.email;

      // Regenerate gravatar if avatar not manually provided in this update
      if (!updateUserDto.avatar) {
        user.avatar = this.createGravatarUrl(user.email);
      }
    }

    // If name is provided, update it
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    // If avatar is provided, update it
    if (updateUserDto.avatar) {
      user.avatar = updateUserDto.avatar;
    }

    const updatedUser = await user.save();
    this.logger.log(`User profile updated: ${updatedUser.email}`);

    return {
      _id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      role: updatedUser.role as UserRole,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new RpcException(new NotFoundException('User not found'));
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new RpcException(new UnauthorizedException('Invalid old password'));
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.clearSession(user);
    await user.save();

    this.logger.log(`Password changed for user: ${user.email}`);
    return { success: true, message: 'Password changed successfully' };
  }

  async getDashboardStats(userId: string) {
    const profile = await this.getProfile(userId);

    let orders: UserOrder[] = [];
    let payments: UserPayment[] = [];

    let orderServiceConnected = true;
    let paymentServiceConnected = true;

    try {
      orders = await firstValueFrom(
        this.orderClient.send<UserOrder[]>(ORDER_PATTERNS.GET_BY_USER, {
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
        this.paymentClient.send<UserPayment[]>(PAYMENT_PATTERNS.GET_BY_USER, {
          userId,
        }),
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
    const safePayments = Array.isArray(payments) ? payments : [];

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalOrders = safeOrders.length;
    const totalSpent = safeOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const weeklyOrders = safeOrders.filter((order) => {
      const created = new Date(order.createdAt ?? 0).getTime();
      return created >= weekAgo;
    });

    const monthlyOrders = safeOrders.filter((order) => {
      const created = new Date(order.createdAt ?? 0).getTime();
      return created >= monthAgo;
    });

    const weeklyOrderAmount = weeklyOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const monthlyOrderAmount = monthlyOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0,
    );

    const totalItemsOrdered = safeOrders.reduce(
      (sum, order) =>
        sum +
        (Array.isArray(order.items)
          ? order.items.reduce<number>((itemSum, item) => {
              const quantity =
                typeof item === 'object' && item !== null && 'quantity' in item
                  ? Number((item as UserOrderItem).quantity ?? 0)
                  : 0;
              return itemSum + quantity;
            }, 0)
          : 0),
      0,
    );

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        totalAmount: number;
      }
    >();

    safeOrders.forEach((order) => {
      if (!Array.isArray(order.items)) {
        return;
      }

      order.items.forEach((item) => {
        if (typeof item !== 'object' || item === null) {
          return;
        }

        const typedItem = item as UserOrderItem;
        const productId = typedItem.productId ?? 'unknown-product';
        const productName = typedItem.productName ?? 'Unknown Product';
        const quantity = Number(typedItem.quantity ?? 0);
        const price = Number(typedItem.price ?? 0);

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

    const paidOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.PAID,
    ).length;
    const pendingOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.PENDING,
    ).length;
    const failedOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.PAYMENT_FAILED,
    ).length;

    const confirmedOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.CONFIRMED,
    ).length;
    const deliveredOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    ).length;
    const cancelledOrders = safeOrders.filter(
      (order) => order.status === OrderStatus.CANCELLED,
    ).length;

    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const weeklyAverageOrderValue =
      weeklyOrders.length > 0 ? weeklyOrderAmount / weeklyOrders.length : 0;

    const monthlyAverageOrderValue =
      monthlyOrders.length > 0 ? monthlyOrderAmount / monthlyOrders.length : 0;

    const sortedOrders = [...safeOrders].sort((a, b) => {
      const left = new Date(a.createdAt ?? 0).getTime();
      const right = new Date(b.createdAt ?? 0).getTime();
      return right - left;
    });

    const lastOrderDate =
      sortedOrders.length > 0 && sortedOrders[0].createdAt
        ? new Date(sortedOrders[0].createdAt).toISOString()
        : null;

    const successfulPayments = safePayments.filter(
      (payment) => payment.status === PaymentStatus.SUCCESS,
    ).length;
    const failedPayments = safePayments.filter(
      (payment) => payment.status === PaymentStatus.FAILED,
    ).length;

    const successfulPaymentAmount = safePayments
      .filter((payment) => payment.status === PaymentStatus.SUCCESS)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const failedPaymentAmount = safePayments
      .filter((payment) => payment.status === PaymentStatus.FAILED)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const totalPaymentAttempts = successfulPayments + failedPayments;
    const paymentSuccessRate =
      totalPaymentAttempts > 0
        ? (successfulPayments / totalPaymentAttempts) * 100
        : 0;

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

  async validateUser(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new RpcException('User not found');
    }

    return { valid: true };
  }
}
