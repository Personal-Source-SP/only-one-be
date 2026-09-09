import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Post, Put, UUIDParam } from '../../../decorators';
import { USER_PAGINATION_CONFIG } from '../constants/user-pagination.config';
import { ChangePasswordRequestDto, UpdateUserRequestDto } from '../dtos/requests';
import { UserDto } from '../dtos/user.dto';
import { UserEntity } from '../entities/user.entity';
import { UserService } from '../services/user.service';

@Controller('users')
@ApiTags('Users')
@Auth()
export class UserController extends BaseController<UserEntity, UserDto> {
    constructor(private readonly userService: UserService) {
        super(userService, USER_PAGINATION_CONFIG);
    }

    @Post({
        path: 'change-password',
        summary: 'Change password',
        responseDto: Boolean,
    })
    async changePassword(@Body() dto: ChangePasswordRequestDto): Promise<boolean> {
        const result = await this.userService.changePassword(dto);
        return result;
    }

    @Put({
        path: ':id',
        summary: 'Update user',
        responseDto: Boolean,
    })
    async update(@UUIDParam('id') id: string, @Body() updateDto: UpdateUserRequestDto): Promise<boolean> {
        const result = await this.userService.update(id, updateDto);
        return result;
    }
}
