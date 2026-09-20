import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNil, omitBy, union } from 'lodash';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { NetworkDeviceDto } from '../dtos';
import { NetworkDeviceStatsResponseDto } from '../dtos/responses';
import { NetworkDeviceEntity } from '../entities';
import { NetworkDeviceType } from '../enums';

@Injectable()
export class NetworkDeviceService extends BaseService<NetworkDeviceEntity, NetworkDeviceDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(NetworkDeviceEntity)
        private readonly networkDeviceRepo: Repository<NetworkDeviceEntity>,
    ) {
        super(networkDeviceRepo, mapper, NetworkDeviceDto, NetworkDeviceService.name);
    }

    async getStats(): Promise<NetworkDeviceStatsResponseDto> {
        const [total, onlineCount, cameraCount, routerCount, iotCount] = await Promise.all([
            this.networkDeviceRepo.count(),
            this.networkDeviceRepo.count({ where: { isOnline: true } }),
            this.networkDeviceRepo.count({ where: { deviceType: NetworkDeviceType.CAMERA } }),
            this.networkDeviceRepo.count({ where: { deviceType: NetworkDeviceType.ROUTER_AP } }),
            this.networkDeviceRepo.count({ where: { deviceType: NetworkDeviceType.SMART_IOT } }),
        ]);

        return new NetworkDeviceStatsResponseDto({
            total,
            onlineCount,
            cameraCount,
            routerCount,
            iotCount,
        });
    }

    async upsertNetworkDevice(data: Partial<NetworkDeviceDto>): Promise<NetworkDeviceDto> {
        let existing = await this.findOneByFilter({ ipAddress: data.ipAddress });
        if (!existing && data.macAddress) {
            existing = await this.findOneByFilter({ macAddress: data.macAddress });
        }

        if (existing) {
            existing.ipAddress = data.ipAddress;

            Object.assign(
                existing,
                omitBy(
                    {
                        model: data.model,
                        vendor: data.vendor,
                        macAddress: data.macAddress,
                        onvifMetadata: data.onvifMetadata,
                        firmwareVersion: data.firmwareVersion,
                    },
                    isNil,
                ),
            );

            existing.openPorts = union(existing.openPorts || [], data.openPorts || []);
            if (data.deviceType && data.deviceType !== NetworkDeviceType.UNKNOWN) {
                existing.deviceType = data.deviceType;
            }

            existing.isOnline = true;
            existing.lastSeenAt = new Date();

            const updated = await super.update(existing.id, existing);
            if (!updated) {
                throw new Error('Failed to update network device');
            }

            return existing;
        }

        const newDevice = this.networkDeviceRepo.create({
            isOnline: true,
            lastSeenAt: new Date(),
            ipAddress: data.ipAddress,
            model: data.model || null,
            vendor: data.vendor || null,
            deviceType: data.deviceType,
            openPorts: data.openPorts || [],
            macAddress: data.macAddress || null,
            onvifMetadata: data.onvifMetadata || null,
            firmwareVersion: data.firmwareVersion || null,
        });

        return await super.create(newDevice);
    }
}
