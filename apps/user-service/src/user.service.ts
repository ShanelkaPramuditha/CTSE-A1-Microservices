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
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterUserDto, LoginUserDto, UpdateUserDto } from '@app/common/dto';
import { IJwtPayload, UserRole } from '@app/common/interfaces';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
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

    return {
      _id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      avatar: savedUser.avatar,
      role: savedUser.role as UserRole,
      createdAt: savedUser.createdAt,
    };
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
    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role as UserRole,
      },
    };
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

    // If name is provided, update it
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    // If avatar is provided, update it, otherwise regenerate if email changed (though email update not implemented here yet)
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
}
