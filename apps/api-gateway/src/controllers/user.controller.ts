// ============================================
// API Gateway - User Controller (Protected Routes)
// ============================================
import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE, USER_PATTERNS } from '@app/common/constants';
import { RegisterUserDto } from '@app/common/dto';
import { UserRole } from '@app/common/interfaces';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(@Inject(USER_SERVICE) private readonly userClient: ClientProxy) {}

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
    // Force role to ADMIN
    registerUserDto.role = UserRole.ADMIN;
    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.REGISTER, registerUserDto),
    );
  }
}
