import { AutoMap } from '@automapper/classes';

import { EnumField, ObjectFieldOptional, StringField } from '../../../../decorators';
import { SimulationService } from '../../enums';

export class CreateSimulationContextRequest {
    @StringField({ maxLength: 255 })
    @AutoMap()
    name: string;

    @StringField({ maxLength: 255 })
    @AutoMap()
    baseUrl: string;

    @EnumField(() => SimulationService, { description: 'Service execution', default: SimulationService.UNLUCID_AI })
    @AutoMap()
    serviceExecution: SimulationService;

    @ObjectFieldOptional()
    @AutoMap(() => Object)
    defaultPayload?: Record<string, any>;

    @ObjectFieldOptional()
    @AutoMap(() => Object)
    steps?: Record<string, any>;
}
