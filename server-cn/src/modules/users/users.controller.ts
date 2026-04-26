import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('me')
  getMe() {
    return {
      status: 'todo',
      region: 'cn',
    };
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return {
      id,
      status: 'todo',
    };
  }
}
