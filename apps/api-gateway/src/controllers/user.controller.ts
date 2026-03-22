// ============================================
// API Gateway - User Controller (Protected Routes)
// ============================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Inject,
  Logger,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { USER_PATTERNS, USER_SERVICE } from '@app/common/constants';
import {
  RegisterUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from '@app/common/dto';
import { UserRole } from '@app/common/interfaces';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly userService: UserService,
  ) {}

  /**
   * GET /api/v1/users/profile
   * Get the current authenticated user's profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: { userId: string; email: string }) {
    this.logger.log(`Profile request for user: ${user.userId}`);
    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.GET_PROFILE, {
        userId: user.userId,
      }),
    );
  }

  /**
   * GET /api/v1/users/dashboard-stats
   * Get user dashboard stats aggregated across services
   */
  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Get current user dashboard stats' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'all'],
    description: 'Time range filter for dashboard stats',
  })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardStats(
    @CurrentUser() user: { userId: string },
    @Query('range') range?: string,
  ) {
    this.logger.log(
      `Dashboard stats request for user: ${user.userId}, range=${range ?? '30d'}`,
    );
    return this.userService.getDashboardStats(user.userId, range);
  }

  /**
   * PATCH /api/v1/users/profile
   * Update current user profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.log(`Update profile for user: ${user.userId}`);
    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.UPDATE_PROFILE, {
        userId: user.userId,
        updateUserDto,
      }),
    );
  }

  /**
   * PATCH /api/v1/users/change-password
   * Change current user password
   */
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid old password' })
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log(`Change password for user: ${user.userId}`);
    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.CHANGE_PASSWORD, {
        userId: user.userId,
        changePasswordDto,
      }),
    );
  }

  /**
   * POST /api/v1/users/admin
   * Register a new admin account (requires admin auth)
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Create a new admin user' })
  @ApiResponse({ status: 201, description: 'Admin registered successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role' })
  async createAdmin(@Body() registerUserDto: RegisterUserDto) {
    this.logger.log(`Admin creation request: ${registerUserDto.email}`);
    registerUserDto.role = UserRole.ADMIN;
    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.REGISTER, registerUserDto),
    );
  }
}
