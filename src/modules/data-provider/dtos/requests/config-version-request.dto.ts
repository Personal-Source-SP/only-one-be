import { AutoMap } from '@automapper/classes';

import { ConfigVersionType } from '../../enums';
import { TargetConfig } from '../../interfaces';

export class CreateConfigVersionRequestDto {
    @AutoMap()
    featureId: string;

    @AutoMap()
    config: TargetConfig;

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
