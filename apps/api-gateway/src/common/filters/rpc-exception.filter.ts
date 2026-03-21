import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle standard NestJS HttpExceptions (e.g. ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      return response.status(status).json({
        ...(typeof res === 'object' ? res : { message: res }),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Handle RPC exceptions from microservices
    // Microservice exceptions are plain objects that usually contain `status` or `statusCode`
    if (
      exception &&
      typeof exception === 'object' &&
      (exception.status || exception.statusCode)
    ) {
      const status = exception.status || exception.statusCode;
      const res = exception.response || exception.message;

      return response.status(status).json({
        ...(typeof res === 'object' ? res : { message: res }),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Fallback for unexpected internal server errors
    this.logger.error(
      `Unhandled Exception on ${request.method} ${request.url}`,
      exception?.stack || exception,
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
