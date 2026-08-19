import { AutoMap } from '@automapper/classes';

import { ConfigVersionType } from '../../enums';

export class CreateConfigVersionRequestDto {
    @AutoMap()
    featureId: string;

    @AutoMap()
    config: Record<string, any>;

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
