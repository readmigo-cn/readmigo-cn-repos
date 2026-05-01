import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiProperty({ enum: ['en', 'zh'] })
  @IsIn(['en', 'zh'])
  from!: 'en' | 'zh';

  @ApiProperty({ enum: ['en', 'zh'] })
  @IsIn(['en', 'zh'])
  to!: 'en' | 'zh';
}
