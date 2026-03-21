// ============================================
// API Gateway - User Controller (Protected Routes)
// ============================================
import { Controller, Get, Inject, Logger, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE, USER_PATTERNS } from '@app/common/constants';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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
}
