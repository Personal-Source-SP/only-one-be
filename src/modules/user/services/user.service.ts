import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ChangePasswordRequestDto, CreateUserRequestDto, UpdateUserRequestDto } from '../dtos/requests';
import { UserDto } from '../dtos/user.dto';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        @InjectMapper() private readonly mapper: Mapper,
        @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    ) {
        super(userRepository);
    }

    async createUser(user: CreateUserRequestDto): Promise<UserDto> {
        const existingUser = await this.findOneByFilter({ email: user.email });
        if (existingUser) throw new ConflictException('Email already exists');

        const userEntity = this.mapper.map(user, CreateUserRequestDto, UserEntity);
        userEntity.password = UtilsService.generateHash(user.password);

        try {
            const result = await this.create(userEntity);
            return this.mapper.map(result, UserEntity, UserDto);
        } catch (error) {
            this.loggerService.error(`Error creating user: ${error.message}`);
            throw error;
        }
    }

    async updateUser(id: string, user: UpdateUserRequestDto): Promise<boolean> {
        const existingUser = await this.findById(id);
        if (!existingUser) throw new NotFoundException('User not found');

        if (user.email && user.email !== existingUser.email) {
            const emailExists = await this.findOneByFilter({ email: user.email, id: Not(id) });
            if (emailExists) throw new ConflictException('Email already in use');
        }

        try {
            const updatedUser = this.mapper.map(user, UpdateUserRequestDto, UserEntity);
            const result = await this.update(id, updatedUser);

            return result;
        } catch (error) {
            this.loggerService.error(`Error updating user: ${error.message}`);
            throw error;
        }
    }

    async changePassword(dto: ChangePasswordRequestDto): Promise<boolean> {
        const user = await this.findById(dto.userId);
        if (!user) throw new NotFoundException('User not found');

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Current password is incorrect');

        try {
            const hashedPassword = UtilsService.generateHash(dto.newPassword);
            const result = await this.update(dto.userId, { password: hashedPassword });

            return result;
        } catch (error) {
            this.loggerService.error(`Error changing password: ${error.message}`);
            throw error;
        }
    }
}
