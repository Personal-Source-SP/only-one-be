import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '@/common/base.controller';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { ResponseDto } from '@/common/dto/response.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

import { ChangePasswordRequestDto } from '../dtos/change-password.request.dto';
import { CreateUserRequestDto, UserQueryRequestDto } from '../dtos/create-user.request.dto';
import { UpdateUserRequestDto } from '../dtos/update-user.request.dto';
import { UserDto } from '../dtos/user.dto';
import { UserService } from '../services/user.service';

@Controller('users')
@ApiTags('users')
export class UserController extends BaseController {
    constructor(private readonly userService: UserService) {
        super();
    }

    @ApiOperation({ summary: 'Get all users' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @UseGuards(JwtAuthGuard)
    @Get('')
    public async getAllUsers(@Query() query: UserQueryRequestDto): Promise<ResponseDto<PaginationResponseDto<UserDto>>> {
        const result = await this.userService.getAllUsers(query);
        return this.getResponse(true, result);
    }

    @ApiOperation({ summary: 'Create user' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @UseGuards(JwtAuthGuard)
    @Post('')
    public async createUser(@Body() user: CreateUserRequestDto): Promise<ResponseDto<UserDto>> {
        const result = await this.userService.createUser(user);
        return this.getResponse(true, result);
    }
    @ApiOperation({ summary: 'Update user' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @UseGuards(JwtAuthGuard)
    @Put(':id')
    public async updateUser(@Param('id') id: string, @Body() updateDto: UpdateUserRequestDto): Promise<ResponseDto<boolean>> {
        const result = await this.userService.updateUser(id, updateDto);
        return this.getResponse(true, result);
    }
    @ApiOperation({ summary: 'Get user by ID' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    public async getUserById(@Param('id') id: string): Promise<ResponseDto<UserDto>> {
        const result = await this.userService.getUserById(id);
        return this.getResponse(true, result);
    }
    @ApiOperation({ summary: 'Change password' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    public async changePassword(@Body() dto: ChangePasswordRequestDto): Promise<ResponseDto<boolean>> {
        const result = await this.userService.changePassword(dto);
        return this.getResponse(true, result);
    }
}
