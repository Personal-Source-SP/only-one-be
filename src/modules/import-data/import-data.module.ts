import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataProviderModule } from '../data-provider/data-provider.module';
import { ItemEntity } from '../data-provider/entities/item.entity';
import { ImportDataController } from './controllers/import-data.controller';
import { ImportDataService } from './services/import-data.service';

const entities = [ItemEntity];
const services = [ImportDataService];
const controllers = [ImportDataController];

@Module({
    imports: [TypeOrmModule.forFeature(entities), DataProviderModule],
    providers: [...services],
    exports: [...services],
    controllers: [...controllers],
})
export class ImportDataModule {}
