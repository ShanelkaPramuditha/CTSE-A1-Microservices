// ============================================
// API Gateway - Auth Controller (Public Routes)
// ============================================
import {
  Controller,
  Post,
  Body,
  Inject,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE, USER_PATTERNS } from '@app/common/constants';
import { RegisterUserDto, LoginUserDto } from '@app/common/dto';
import { UserRole } from '@app/common/interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(USER_SERVICE) private readonly userClient: ClientProxy) {}

  /**
   * POST /api/v1/auth/register
   * Register a new user account
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    this.logger.log(`Registration request: ${registerUserDto.email}`);
    // Prevent creating admin accounts via public auth endpoint
    if (registerUserDto.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admin role can only be created by an existing admin',
      );
    }

    return firstValueFrom(
      this.userClient.send(USER_PATTERNS.REGISTER, registerUserDto),
    );
  }

  /**
   * POST /api/v1/auth/login
   * Login and receive JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log(`Login request: ${loginUserDto.email}`);
    const tokenObj = await firstValueFrom(
      this.userClient.send(USER_PATTERNS.LOGIN, loginUserDto),
    );

    response.cookie('Authentication', tokenObj.accessToken, {
      httpOnly: true,
      path: '/',
      maxAge: 3600 * 1000, // 1 hour
    });

    return tokenObj;
  }

  /**
   * POST /api/v1/auth/logout
   * Logout and clear JWT cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear JWT cookie' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('Authentication');
    return { message: 'Logged out successfully' };
  }
}
