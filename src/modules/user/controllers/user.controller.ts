import { Body, Controller, HttpCode, HttpStatus, Post, Put, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, BaseApiOkResponse, UUIDParam } from '../../../decorators';
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

    @ApiOperation({ summary: 'Change password' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    @Post('change-password')
    public async changePassword(@Body() dto: ChangePasswordRequestDto): Promise<boolean> {
        const result = await this.userService.changePassword(dto);
        return result;
    }

    @ApiOperation({ summary: 'Update user' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    @Put(':id')
    public async update(@UUIDParam('id') id: string, @Body() updateDto: UpdateUserRequestDto): Promise<boolean> {
        const result = await this.userService.update(id, updateDto);
        return result;
    }
}
