import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { UpdateGoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthService } from '../services/google-auth.service';

@Controller('google-auth')
@ApiTags('google-auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleAuthController extends BaseController {
    constructor(private readonly googleAuthService: GoogleAuthService) {
        super();
    }

    @ApiOperation({ summary: 'Get list of google auth' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkResponse({ type: [GoogleAuthDto] })
    public async getListGoogleAuth(@User() user: PayloadDto): Promise<GoogleAuthDto[]> {
        const result = await this.googleAuthService.getListGoogleAuth(user.id);
        return result;
    }

    @ApiOperation({ summary: 'Update Google auth' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put()
    @ApiOkResponse({ type: String })
    public async updateGoogleAuth(@User() user: PayloadDto, @Body() request: UpdateGoogleAuthRequestDto): Promise<boolean> {
        const result = await this.googleAuthService.updateGoogleAuth(request, user.id);
        return result;
    }
}
