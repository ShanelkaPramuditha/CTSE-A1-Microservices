// ============================================
// User Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_PATTERNS } from '@app/common/constants';
import {
  RegisterUserDto,
  LoginUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  RefreshSessionDto,
} from '@app/common/dto';
import { UserService } from './user.service';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Register a new user
   * TCP Pattern: register_user
   */
  @MessagePattern(USER_PATTERNS.REGISTER)
  async register(@Payload() registerUserDto: RegisterUserDto) {
    this.logger.log(`Registering user: ${registerUserDto.email}`);
    return this.userService.register(registerUserDto);
  }

  /**
   * Login user and return JWT token
   * TCP Pattern: login_user
   */
  @MessagePattern(USER_PATTERNS.LOGIN)
  async login(@Payload() loginUserDto: LoginUserDto) {
    this.logger.log(`Login attempt: ${loginUserDto.email}`);
    return this.userService.login(loginUserDto);
  }

  /**
   * Refresh user session
   */
  @MessagePattern(USER_PATTERNS.REFRESH_SESSION)
  async refreshSession(@Payload() refreshSessionDto: RefreshSessionDto) {
    this.logger.log('Refreshing user session');
    return this.userService.refreshSession(refreshSessionDto.refreshToken);
  }

  /**
   * Logout user session
   */
  @MessagePattern(USER_PATTERNS.LOGOUT_SESSION)
  async logout(@Payload() refreshSessionDto: RefreshSessionDto) {
    this.logger.log('Logging out user session');
    return this.userService.logout(refreshSessionDto.refreshToken);
  }

  /**
   * Get user profile by ID
   * TCP Pattern: get_user_profile
   */
  @MessagePattern(USER_PATTERNS.GET_PROFILE)
  async getProfile(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching profile for user: ${data.userId}`);
    return this.userService.getProfile(data.userId);
  }

  /**
   * Update user profile
   * TCP Pattern: update_user_profile
   */
  @MessagePattern(USER_PATTERNS.UPDATE_PROFILE)
  async updateProfile(
    @Payload() data: { userId: string; updateUserDto: UpdateUserDto },
  ) {
    this.logger.log(`Updating profile for user: ${data.userId}`);
    return this.userService.updateProfile(data.userId, data.updateUserDto);
  }

  /**
   * Change user password
   * TCP Pattern: change_password
   */
  @MessagePattern(USER_PATTERNS.CHANGE_PASSWORD)
  async changePassword(
    @Payload() data: { userId: string; changePasswordDto: ChangePasswordDto },
  ) {
    this.logger.log(`Changing password for user: ${data.userId}`);
    return this.userService.changePassword(data.userId, data.changePasswordDto);
  }

  @MessagePattern(USER_PATTERNS.GET_DASHBOARD_STATS)
  async getDashboardStats(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching dashboard stats for user: ${data.userId}`);
    return this.userService.getDashboardStats(data.userId);
  }

  /**
   * Validate user
   * TCP Pattern: validate_user
   */
  @MessagePattern(USER_PATTERNS.VALIDATE_USER)
  async validateUser(@Payload() data: { userId: string }) {
    this.logger.log(`Validating id for user: ${data.userId}`);
    return this.userService.validateUser(data.userId);
  }
}
