import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '@/common/base.controller';
import { ResponseDto } from '@/common/dto/response.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { ChangePasswordRequestDto, UpdateUserRequestDto } from '../dtos/requests';
import { UserService } from '../services/user.service';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController extends BaseController {
    constructor(private readonly userService: UserService) {
        super();
    }

    @ApiOperation({ summary: 'Update user' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    @Put(':id')
    public async updateUser(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() updateDto: UpdateUserRequestDto,
    ): Promise<ResponseDto<boolean>> {
        const result = await this.userService.updateUser(id, updateDto);
        return this.getResponse(true, result);
    }

    @ApiOperation({ summary: 'Change password' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    @Post('change-password')
    public async changePassword(@Body() dto: ChangePasswordRequestDto): Promise<ResponseDto<boolean>> {
        const result = await this.userService.changePassword(dto);
        return this.getResponse(true, result);
    }
}
