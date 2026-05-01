import { IsString, Length, Matches } from 'class-validator';

export class SmsLoginDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'invalid_phone' })
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}
