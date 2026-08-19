import { BadRequestException, Injectable } from '@nestjs/common';

import { DataProviderFeatureType } from '../enums';
import { IFeatureRunner } from './interfaces/feature-runner.interface';
import { ScrapingFeatureRunner } from './scraping-feature.runner';
import { SearchFeatureRunner } from './search-feature.runner';

@Injectable()
export class FeatureRunnerRegistry {
    private readonly runnerMap: Map<DataProviderFeatureType, IFeatureRunner>;

    constructor(scrapingRunner: ScrapingFeatureRunner, searchRunner: SearchFeatureRunner) {
        this.runnerMap = new Map<DataProviderFeatureType, IFeatureRunner>([
            [DataProviderFeatureType.SCRAPING, scrapingRunner],
            [DataProviderFeatureType.SEARCH, searchRunner],
        ]);
    }

    getRunner(type: DataProviderFeatureType): IFeatureRunner {
        const runner = this.runnerMap.get(type);
        if (!runner) {
            throw new BadRequestException(`No feature runner registered for type: ${type}`);
        }
        return runner;
    }
}
