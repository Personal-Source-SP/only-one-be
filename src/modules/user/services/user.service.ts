import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Brackets, Not, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ChangePasswordRequestDto, UpdateUserRequestDto, UserPaginationRequestDto } from '../dtos/requests';
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

    async getUserLogin(email: string): Promise<UserEntity> {
        try {
            const user = await this.userRepository
                .createQueryBuilder('user')
                .where(new Brackets((qb) => qb.orWhere('email = :email', { email }).orWhere('user_name = :userName', { userName: email })))
                .getOne();

            if (!user) throw new NotFoundException('User not found');

            return user;
        } catch (error) {
            this.loggerService.error(`Error getting user login: ${error.message}`);
            throw error;
        }
    }

    async getUsersPagination(query: UserPaginationRequestDto, globalConfig: PaginateConfig<UserEntity>): Promise<Paginated<UserDto>> {
        try {
            const paginatedResult: Paginated<UserEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.userRepository,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, UserEntity, UserDto);
            return { ...paginatedResult, data } as Paginated<UserDto>;
        } catch (error) {
            this.loggerService.error(`Get users pagination error: ${error?.message}`);
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async getUserById(id: string): Promise<UserDto> {
        const user = await this.findById(id);
        if (!user) {
            this.loggerService.error(`User not found with id ${id}`);
            return null;
        }

        return this.mapper.map(user, UserEntity, UserDto);
    }

    async updateUser(id: string, user: UpdateUserRequestDto): Promise<boolean> {
        const existingUser = await this.findById(id);
        if (!existingUser) throw new NotFoundException('User not found');

        if (user.email && user.email !== existingUser.email) {
            const emailExists = await this.exists({ email: user.email, id: Not(id) });
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
