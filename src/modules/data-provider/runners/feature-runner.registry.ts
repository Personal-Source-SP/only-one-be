import { Injectable } from '@nestjs/common';

import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { DataProviderFeatureType } from '../enums';
import { IFeatureRunner } from '../interfaces';
import { ScrapingFeatureRunner } from './scraping-feature.runner';

@Injectable()
export class FeatureRunnerRegistry {
    private readonly runnerMap: Map<DataProviderFeatureType, IFeatureRunner>;

    constructor(scrapingRunner: ScrapingFeatureRunner) {
        this.runnerMap = new Map<DataProviderFeatureType, IFeatureRunner>([[DataProviderFeatureType.SCRAPING, scrapingRunner]]);
    }

    getRunner(type: DataProviderFeatureType): IFeatureRunner {
        const runner = this.runnerMap.get(type);
        if (!runner) {
            throw new AppException(DataProviderError.RunnerNotFound(type));
        }
        return runner;
    }
}
