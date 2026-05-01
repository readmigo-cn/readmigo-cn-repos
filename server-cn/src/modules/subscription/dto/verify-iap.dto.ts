import { IsIn, IsString, MaxLength } from 'class-validator';

export class VerifyIapDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  @IsIn(['pro_monthly', 'pro_yearly', 'premium_monthly'])
  plan!: 'pro_monthly' | 'pro_yearly' | 'premium_monthly';

  @IsString()
  @MaxLength(512)
  purchaseToken!: string;

  @IsString()
  @MaxLength(8192)
  rawReceipt!: string;
}
