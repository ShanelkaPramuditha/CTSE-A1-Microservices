// ============================================
// Payment Service - Mongoose Schema
// ============================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PaymentStatus } from '@app/common/constants';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: string;

  @Prop()
  transactionId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Index for order lookups
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
