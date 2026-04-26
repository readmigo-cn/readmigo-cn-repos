import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, Max, MaxLength, Min, ValidateNested } from 'class-validator';

import { ChatMessageDto } from './chat-message.dto.js';

export class ChatRequestDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(128)
  model?: string;
}
