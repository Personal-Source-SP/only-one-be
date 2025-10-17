import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';
import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { USER_PAGINATION_CONFIG } from '../constants/user-pagination.config';
import { ChangePasswordRequestDto, UpdateUserRequestDto, UserPaginationRequestDto } from '../dtos/requests';
import { UserDto } from '../dtos/user.dto';
import { UserService } from '../services/user.service';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController extends BaseController {
    constructor(private readonly userService: UserService) {
        super();
    }

    @ApiOperation({ summary: 'Get user by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: UserDto })
    public async getUserById(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserDto> {
        const result = await this.userService.getUserById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated users' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(UserDto, USER_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(UserDto, USER_PAGINATION_CONFIG)
    @ApiPaginationQuery(USER_PAGINATION_CONFIG)
    public async getUsersPagination(@Paginate() query: UserPaginationRequestDto): Promise<Paginated<UserDto>> {
        const result = await this.userService.getUsersPagination(query, USER_PAGINATION_CONFIG);
        return result;
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
    public async updateUser(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateDto: UpdateUserRequestDto): Promise<boolean> {
        const result = await this.userService.updateUser(id, updateDto);
        return result;
    }
}
