import { AutoMap } from '@automapper/classes';
import { ConfigVersionType } from '../../enums';
import { ITargetConfig } from '../../interfaces';

export class CreateConfigVersionRequestDto {
    @AutoMap()
    dataProviderId: string;

    @AutoMap()
    targetConfig: ITargetConfig;

    @AutoMap()
    isActive: boolean;

    @AutoMap()
    changeType: ConfigVersionType;

    @AutoMap()
    changeDescription?: string;

    constructor(data: CreateConfigVersionRequestDto) {
        Object.assign(this, data);
    }
}
