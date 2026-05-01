import { IsString, Matches } from 'class-validator';

export class SmsSendDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'invalid_phone' })
  phone!: string;
}
