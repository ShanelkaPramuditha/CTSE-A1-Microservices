// ============================================
// API Gateway - Product Controller
// ============================================
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  ApiParam,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { PRODUCT_SERVICE, PRODUCT_PATTERNS } from '@app/common/constants';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ValidateStockDto,
} from '@app/common/dto';
import { UserRole } from '@app/common/interfaces';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all products' })
  @ApiResponse({ status: 200, description: 'Products returned' })
  async findAll(@Query() query: ListProductsQueryDto) {
    this.logger.log('List products');
    return firstValueFrom(
      this.productClient.send(PRODUCT_PATTERNS.GET_ALL, {
        limit: query?.limit,
        offset: query?.offset,
        category: query?.category,
      }),
    );
  }

  @Get(':productId')
  @Public()
  @ApiParam({ name: 'productId', description: 'Product MongoDB id' })
  @ApiOperation({ summary: 'Get product by id' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  async findOne(@Param('productId') productId: string) {
    this.logger.log(`Get product: ${productId}`);
    return firstValueFrom(
      this.productClient.send(PRODUCT_PATTERNS.GET_BY_ID, { productId }),
    );
  }

  @Post('validate-stock')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Check if enough stock is available' })
  @ApiResponse({ status: 200, description: 'Stock validation result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateStock(@Body() dto: ValidateStockDto) {
    this.logger.log(`Validate stock: ${dto.productId} x ${dto.quantity}`);
    return firstValueFrom(
      this.productClient.send(PRODUCT_PATTERNS.VALIDATE_STOCK, dto),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Create a product (admin only)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createProductDto: CreateProductDto) {
    this.logger.log(`Create product: ${createProductDto.name}`);
    return firstValueFrom(
      this.productClient.send(PRODUCT_PATTERNS.CREATE, createProductDto),
    );
  }
}
