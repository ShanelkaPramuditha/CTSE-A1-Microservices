// ============================================
// User Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_PATTERNS } from '@app/common/constants';
import { RegisterUserDto, LoginUserDto } from '@app/common/dto';
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
   * Get user profile by ID
   * TCP Pattern: get_user_profile
   */
  @MessagePattern(USER_PATTERNS.GET_PROFILE)
  async getProfile(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching profile for user: ${data.userId}`);
    return this.userService.getProfile(data.userId);
  }
}
