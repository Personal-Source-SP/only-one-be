import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { UtilsService } from '../../../shared/services/utils.service';
import { UserError } from '../constants/user-error';
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

            if (!user) throw new AppException(UserError.UserNotFound);

            return user;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getUserRefreshToken(id: string): Promise<UserEntity> {
        const user = await this.repository.findOneBy({ id });
        if (!user) throw new AppException(UserError.UserNotFound);

        return user;
    }

    async create(user: CreateUserRequestDto): Promise<UserDto> {
        const existingUser = await this.exists({ email: user.email });
        if (existingUser) throw new AppException(UserError.EmailAlreadyExists);

        const entity = this.mapper.map(user, CreateUserRequestDto, UserEntity);

        return await super.create(entity);
    }

    async update(id: string, user: UpdateUserRequestDto): Promise<boolean> {
        const existingUser = await this.findById(id);
        if (!existingUser) throw new AppException(UserError.UserNotFound);

        if (user.email && user.email !== existingUser.email) {
            const emailExists = await this.exists({ email: user.email, id: Not(id) });
            if (emailExists) throw new AppException(UserError.EmailAlreadyInUse);
        }

        return await super.update(id, user);
    }

    async changePassword(dto: ChangePasswordRequestDto): Promise<boolean> {
        const user = await this.repository.findOneBy({ id: dto.userId });
        if (!user) throw new AppException(UserError.UserNotFound);

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isPasswordValid) throw new AppException(UserError.InvalidCurrentPassword);

        return await super.update(user.id, { password: UtilsService.generateHash(dto.newPassword) });
    }
}
