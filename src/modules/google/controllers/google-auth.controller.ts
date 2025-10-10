import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { GoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthService } from '../services/google-auth.service';

@Controller('google-auth')
@ApiTags('google-auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleAuthController extends BaseController {
    constructor(private readonly googleAuthService: GoogleAuthService) {
        super();
    }

    @ApiOperation({ summary: 'Get Google auth' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkResponse({ type: GoogleAuthDto })
    public async getGoogleAuth(@User() user: PayloadDto): Promise<GoogleAuthDto> {
        const result = await this.googleAuthService.getGoogleAuth(user.id);
        return result;
    }

    @ApiOperation({ summary: 'Authorize user' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('authorize')
    @ApiOkResponse({ type: String })
    public async authorizeUser(@User() user: PayloadDto, @Body() request: GoogleAuthRequestDto): Promise<string> {
        const result = await this.googleAuthService.authorizeUser(request, user.id);
        return result;
    }

    @ApiOperation({ summary: 'Refresh token' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('refresh-token')
    @ApiOkResponse({ type: String })
    public async refreshToken(@User() user: PayloadDto): Promise<string> {
        const result = await this.googleAuthService.refreshToken(user.id);
        return result;
    }

    @ApiOperation({ summary: 'Revoke access' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('revoke-access')
    @ApiOkResponse({ type: Boolean })
    public async revokeAccess(@User() user: PayloadDto): Promise<boolean> {
        const result = await this.googleAuthService.revokeAccess(user.id);
        return result;
    }
}
