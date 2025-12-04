import { Body, Controller, HttpCode, HttpStatus, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { UpdateGoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleAuthService } from '../services/google-auth.service';

@Controller('google-auth')
@ApiTags('Google Auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleAuthController extends BaseController<GoogleAuthEntity, GoogleAuthDto> {
    constructor(private readonly googleAuthService: GoogleAuthService) {
        super(googleAuthService);
    }

    @ApiOperation({ summary: 'Update Google auth' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put()
    @ApiOkResponse({ type: String })
    public async updateGoogleAuth(@User() user: PayloadDto, @Body() request: UpdateGoogleAuthRequestDto): Promise<boolean> {
        const result = await this.googleAuthService.update(user.id, request);
        return result;
    }
}
