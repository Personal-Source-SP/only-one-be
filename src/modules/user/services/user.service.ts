import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { DataSource, ILike, Not, Repository } from 'typeorm';

import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { AppConfigService } from '@/shared/services/app-config.service';
import { LoggerService } from '@/shared/services/logger.service';

import { ChangePasswordRequestDto } from '../dtos/change-password.request.dto';
import { CreateUserRequestDto, UserQueryRequestDto } from '../dtos/create-user.request.dto';
import { UpdateUserRequestDto } from '../dtos/update-user.request.dto';
import { UserDto } from '../dtos/user.dto';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit {
    // module init
    async onModuleInit() {
        //
    }
    private readonly userRepository: Repository<UserEntity>;

    constructor(
        private readonly configService: AppConfigService,
        private readonly loggerService: LoggerService,
        private readonly eventEmitter: EventEmitter2,

        readonly _dataSource: DataSource,
        @InjectMapper() private readonly _mapper: Mapper,
    ) {
        this.userRepository = _dataSource.getRepository(UserEntity);
    }

    public async createUser(user: CreateUserRequestDto): Promise<UserDto> {
        try {
            const existingUser = await this.userRepository.findOne({
                where: { email: user.email },
            });

            if (existingUser) {
                this.loggerService.error('User already exists');
                throw new ConflictException('Email already exists');
            }

            const userEntity = this._mapper.map(user, CreateUserRequestDto, UserEntity);

            const salt = await bcrypt.genSalt(10);
            userEntity.password = await bcrypt.hash(user.password, salt);

            const result = await this.userRepository.save(userEntity);
            return this._mapper.map(result, UserEntity, UserDto);
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }
    public async findByEmail(email: string): Promise<UserEntity | null> {
        const result = await this.userRepository.findOne({ where: { email: ILike(email) } });
        if (!result) {
            return null;
        }

        return result;
    }

    public async findById(id: string): Promise<UserEntity> {
        const result = await this.userRepository.findOne({ where: { id } });
        if (!result) {
            return null;
        }

        return result;
    }

    public async updateUser(id: string, user: UpdateUserRequestDto): Promise<boolean> {
        try {
            const existingUser = await this.userRepository.findOne({ where: { id } });
            if (!existingUser) {
                throw new NotFoundException('User not found');
            }

            // Check validation email only if email is provided
            if (user.email) {
                const isEmailFormat = await this.checkEmailFormat(user.email);
                if (!isEmailFormat) {
                    throw new Error('Invalid email format');
                }

                // Only check for email conflicts if email is changing
                if (user.email !== existingUser.email) {
                    const emailExists = await this.userRepository.findOne({
                        where: { email: user.email, id: Not(id) },
                    });
                    if (emailExists) {
                        throw new ConflictException('Email already in use');
                    }
                }
            }

            const updatedUser = this._mapper.map(user, UpdateUserRequestDto, UserEntity);
            await this.userRepository.update(id, updatedUser);
            return true;
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }

    private async checkEmailFormat(email: string): Promise<boolean> {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    public async getAllUsers(query: UserQueryRequestDto): Promise<PaginationResponseDto<UserDto>> {
        try {
            const builder = this.userRepository.createQueryBuilder('user');
            if (query.filter) {
                builder.where('(user.lastName ILIKE :filter OR user.firstName ILIKE :filter OR user.email ILIKE :filter)', {
                    filter: `%${query.filter}%`,
                });
            }

            // Filter by role if provided
            if (query.role) {
                builder.andWhere('user.role = :role', { role: query.role });
            }
            if (query.skip) {
                builder.skip(query.skip);
            }
            if (query.take) {
                builder.take(query.take);
            }
            if (query?.order && query.order === 'DESC') {
                builder.orderBy('user.createdAt', 'DESC');
            } else {
                builder.orderBy('user.createdAt', 'ASC');
            }

            const [users, total] = await builder.getManyAndCount();
            const userDtos = this._mapper.mapArray(users, UserEntity, UserDto);

            return {
                data: userDtos,
                total,
            };
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }

    public async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'phoneNumber', 'isEmailVerified'],
        });
    }
    public async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
    public async findByPasswordResetToken(hashedToken: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { passwordResetToken: hashedToken } });
    }
    public async generateSalt(): Promise<string> {
        return await bcrypt.genSalt(10);
    }
    public async hashPassword(password: string, salt: string): Promise<string> {
        return await bcrypt.hash(password, salt);
    }

    public async changePassword(dto: ChangePasswordRequestDto): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: dto.userId },
                select: ['id', 'password'],
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Verify current password
            const isPasswordValid = await this.comparePassword(dto.currentPassword, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Current password is incorrect');
            }

            // Hash new password
            const salt = await this.generateSalt();
            const hashedPassword = await this.hashPassword(dto.newPassword, salt);

            // Update password
            await this.userRepository.update(dto.userId, { password: hashedPassword });

            return true;
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }
    public async getUserById(id: string): Promise<UserDto> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this._mapper.map(user, UserEntity, UserDto);
    }
}
