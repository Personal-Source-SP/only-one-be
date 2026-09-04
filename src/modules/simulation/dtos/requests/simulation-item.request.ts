import { AutoMap } from '@automapper/classes';

import { ObjectFieldOptional, StringField } from '../../../../decorators';

export class CreateSimulationItemRequest {
    @StringField({ description: 'Simulation context ID' })
    @AutoMap()
    simulationContextId: string;

    @ObjectFieldOptional({ description: 'Payload' })
    @AutoMap(() => Object)
    payload?: Record<string, any>;
}
