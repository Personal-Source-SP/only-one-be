import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { IScrapingTargetConfig } from './target-config.interface';

export interface IDiscoveryFetchHtmlResult {
    html: string;
    title?: string;
}

export interface IDiscoveryCrawlQueueItem {
    url: string;
    depth: number;
}

export interface IDiscoveryExtractedItem {
    url: string;
    title?: string;
    description?: string;
}

export interface IRunDiscoveryParams {
    session: DiscoverySessionEntity;
    targetKeyword?: string;
    targetConfig?: IScrapingTargetConfig;
}
