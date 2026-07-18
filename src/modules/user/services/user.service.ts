import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ChangePasswordRequestDto, CreateUserRequestDto, UpdateUserRequestDto } from '../dtos/requests';
import { UserDto } from '../dtos/user.dto';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService extends BaseService<UserEntity, UserDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(UserEntity) userRepository: Repository<UserEntity>) {
        super(userRepository, mapper, UserDto, UserService.name);
    }

    async getUserLogin(email: string): Promise<UserEntity> {
        try {
            const user = await this.repository
                .createQueryBuilder('user')
                .where(new Brackets((qb) => qb.orWhere('email = :email', { email }).orWhere('user_name = :userName', { userName: email })))
                .getOne();

            if (!user) throw new NotFoundException('User not found');

            return user;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getUserRefreshToken(id: string): Promise<UserEntity> {
        const user = await this.repository.findOneBy({ id });
        if (!user) throw new NotFoundException('User not found');

        return user;
    }

    async create(user: CreateUserRequestDto): Promise<UserDto> {
        const existingUser = await this.exists({ email: user.email });
        if (existingUser) throw new ConflictException('Email already exists');

        const entity = this.mapper.map(user, CreateUserRequestDto, UserEntity);

        return await super.create(entity);
    }

    async update(id: string, user: UpdateUserRequestDto): Promise<boolean> {
        const existingUser = await this.findById(id);
        if (!existingUser) throw new NotFoundException('User not found');

        if (user.email && user.email !== existingUser.email) {
            const emailExists = await this.exists({ email: user.email, id: Not(id) });
            if (emailExists) throw new ConflictException('Email already in use');
        }

        return await super.update(id, user);
    }

    async changePassword(dto: ChangePasswordRequestDto): Promise<boolean> {
        const user = await this.repository.findOneBy({ id: dto.userId });
        if (!user) throw new NotFoundException('User not found');

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Current password is incorrect');

        return await super.update(user.id, { password: UtilsService.generateHash(dto.newPassword) });
    }
}
