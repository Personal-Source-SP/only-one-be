import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, PutRestApi, User } from '../../../decorators';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { UpdateGoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleAuthService } from '../services/google-auth.service';

@Controller('google-auth')
@ApiTags('Google Auth')
@Auth()
export class GoogleAuthController extends BaseController<GoogleAuthEntity, GoogleAuthDto> {
    constructor(private readonly googleAuthService: GoogleAuthService) {
        super(googleAuthService);
    }

    @PutRestApi({
        summary: 'Update Google auth',
        responseDto: Boolean,
    })
    async updateGoogleAuth(@User() user: PayloadDto, @Body() request: UpdateGoogleAuthRequestDto): Promise<boolean> {
        const result = await this.googleAuthService.update(user.id, request);
        return result;
    }
}
