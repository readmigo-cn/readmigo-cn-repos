import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

export enum ChatMessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

export class ChatMessageDto {
  @ApiProperty({ enum: ChatMessageRole })
  @IsEnum(ChatMessageRole)
  role!: ChatMessageRole;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;
}
