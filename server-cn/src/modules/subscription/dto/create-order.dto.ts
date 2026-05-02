import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MaxLength(50)
  planCode!: string;

  @IsIn(['hms-iap', 'wechat-pay', 'alipay'])
  source!: 'hms-iap' | 'wechat-pay' | 'alipay';
}
