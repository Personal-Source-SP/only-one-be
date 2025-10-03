// import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
// import { Injectable, Logger } from '@nestjs/common';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import { Job } from 'bull';

// import { DataProviderService } from '@/modules/data-provider/services/data-provider.service';
// import { DataProviderProductService } from '@/modules/data-provider/services/data-provider-product.service';
// import { PriceMatrixService } from '@/modules/data-provider/services/price-matrix.service';

// import { CustomError } from '../../../exceptions/custom-error.exception';
// import { UtilsService } from '../../../shared/services/utils.service';
// import { SCRAPING_JOB_LOG_EVENTS } from '../../data-provider/constants/events';
// import { CreatePriceHistoryDto } from '../../data-provider/dtos/create-price-history-request.dto';
// import { ScrapeProductPriceResponseDto } from '../../data-provider/dtos/scrape-product-price-response.dto';
// import { PriceHistoryEntity } from '../../data-provider/entities/data-history.entity';
// import { ScrapeStatusEnum, ScrapingJobStatus } from '../../data-provider/enums';
// import { LogLevelTypesEnum } from '../../data-provider/enums/log-level-types.enum';
// import { DataProviderScraperService } from '../../data-provider/services/data-provider-scraper.service';
// import { PriceHistoryService } from '../../data-provider/services/price-history.service';
// import { ScrapingJobService } from '../../data-provider/services/scraping-job.service';
// import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
// import { IScrapingScheduleJobQueue } from '../../queue/interfaces/scraping-schedule-job-queue.interface';
// import { SCRAPING_WORKER_MESSAGE } from '../constants/message';
// import { parsePrice } from '../helpers/price-parser';

// export type ScrapingWorkerProcessorType = Job<IScrapingScheduleJobQueue>;

// @Processor(QUEUE_NAME.SCRAPING_JOB_QUEUE)
// @Injectable()
// export class ScrapingWorkerProcessor {
//     private readonly logger = new Logger(ScrapingWorkerProcessor.name);
//     private readonly workerProcessName: string;

//     constructor(
//         private readonly dataProviderScraperService: DataProviderScraperService,
//         private readonly eventEmitter: EventEmitter2,
//         private readonly scrapingJobService: ScrapingJobService,
//         private readonly priceHistoryService: PriceHistoryService,

//         private readonly dataProviderService: DataProviderService,
//         private readonly dataProviderProductService: DataProviderProductService,
//         private readonly priceMatrixService: PriceMatrixService,
//     ) {
//         this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
//         this.logger.log(`ScrapingWorkerProcessor initialized on worker: ${this.workerProcessName}`);
//     }

//     @Process()
//     async process(job: ScrapingWorkerProcessorType): Promise<string> {
//         this.logger.log(`[${this.workerProcessName}] Starting job ${job.id}, attempts: ${job.attemptsMade}`);
//         // Update the status to processing
//         if (!job.attemptsMade) {
//             await this.updateScrapingJob(job, ScrapingJobStatus.PROCESSING);
//         }

//         const scrapingJobId = job.data.jobId;
//         const scrapingJob = await this.scrapingJobService.findOneByFilter({ id: scrapingJobId });
//         if (!scrapingJob) {
//             await job.moveToFailed({ message: `Scraping job ${scrapingJobId} not found` });
//             return;
//         }
//         const dataProviderProduct = await this.dataProviderProductService.getDataProviderProductById(scrapingJob.dataProviderProductId, {
//             id: true,
//             dataProviderId: true,
//         });

//         if (!dataProviderProduct) {
//             await job.moveToFailed({ message: `Data provider product ${scrapingJob.dataProviderProductId} not found` });
//             await this.dataProviderService.updateConsecutiveScrapeErrors(dataProviderProduct.dataProviderId, ScrapingJobStatus.FAILED);
//             return;
//         }

//         try {
//             await this.priceMatrixService.sendLatestPriceHistorySnapshotUpdate(dataProviderProduct.id, ScrapeStatusEnum.PROCESSING);

//             const productExtractData = await this.dataProviderScraperService.scrapeProductPrice(scrapingJob.dataProviderProductId);
//             if (productExtractData.status !== 'success') {
//                 throw new CustomError(productExtractData?.error || SCRAPING_WORKER_MESSAGE.EXTRACTING_PRODUCT_PRICE_FAILED);
//             }

//             let price = parsePrice(productExtractData?.productPrice);
//             let regularPrice = parsePrice(productExtractData?.regularPrice);

//             // At least one price must be available and valid
//             if (!price && !regularPrice) {
//                 throw new CustomError(SCRAPING_WORKER_MESSAGE.FAILED_TO_PARSE_PRICE, {
//                     productPrice: productExtractData?.productPrice,
//                     regularPrice: productExtractData?.regularPrice,
//                     parsedPrice: price,
//                     parsedRegularPrice: regularPrice,
//                 });
//             }

//             // If both prices exist, regular price should be greater than or equal to the sale price
//             if (regularPrice && price && regularPrice < price) {
//                 throw new CustomError(SCRAPING_WORKER_MESSAGE.REGULAR_PRICE_LOWER_THAN_PRICE, {
//                     productPrice: productExtractData?.productPrice,
//                     regularPrice: productExtractData?.regularPrice,
//                     parsedPrice: price,
//                     parsedRegularPrice: regularPrice,
//                 });
//             }

//             // price exist but regular price not exist
//             if (price && !regularPrice) {
//                 regularPrice = price;
//             } else if (!price && regularPrice) {
//                 price = regularPrice;
//             }

//             const priceHistory = await this._createPriceHistory(price, regularPrice, scrapingJobId, productExtractData);
//             if (!priceHistory) throw new CustomError(SCRAPING_WORKER_MESSAGE.FAILED_TO_SAVE_PRICE_HISTORY);

//             // Update the status to completed
//             await this.updateScrapingJob(job, ScrapingJobStatus.COMPLETED);

//             await this.dataProviderService.updateConsecutiveScrapeErrors(dataProviderProduct.dataProviderId, ScrapingJobStatus.COMPLETED);

//             await this.priceMatrixService.sendLatestPriceHistorySnapshotUpdate(dataProviderProduct.id);

//             this.logger.log(`[${this.workerProcessName}] Completed job ${job.id} successfully.`);
//             return priceHistory.id;
//         } catch (error) {
//             // Update the status to failed
//             await this.updateScrapingJob(job, ScrapingJobStatus.FAILED);
//             await this.dataProviderService.updateConsecutiveScrapeErrors(dataProviderProduct.dataProviderId, ScrapingJobStatus.FAILED);

//             this.logger.error(`[${this.workerProcessName}] Error processing job ${job.id}: ${error?.message}`, error?.stack);
//             throw new CustomError(error?.message, error?.data);
//         }
//     }

//     @OnQueueActive()
//     async onActive(job: ScrapingWorkerProcessorType): Promise<void> {
//         const attemptsMade = job.attemptsMade;
//         if (attemptsMade) return;

//         this.logger.log(`[${this.workerProcessName}] Job ${job.data.jobId} is active.`);
//         const scrapingJobId = job.data.jobId;
//         this.eventEmitter.emit(SCRAPING_JOB_LOG_EVENTS.ALL, {
//             scrapingJobId,
//             logLevel: LogLevelTypesEnum.INFO,
//             message: SCRAPING_WORKER_MESSAGE.SCRAPING_WORKER_STARTED,
//         });
//     }

//     @OnQueueCompleted()
//     async onCompleted(job: ScrapingWorkerProcessorType, priceHistoryId: string): Promise<void> {
//         const scrapingJobId = job.data.jobId;
//         this.logger.log(`[${this.workerProcessName}] Job ${scrapingJobId} completed. Price history ID: ${priceHistoryId}`);
//         this.eventEmitter.emit(SCRAPING_JOB_LOG_EVENTS.ALL, {
//             scrapingJobId,
//             priceHistoryId,
//             logLevel: LogLevelTypesEnum.INFO,
//             message: SCRAPING_WORKER_MESSAGE.SUCCESS_TO_SAVE_PRICE_HISTORY,
//         });
//     }

//     @OnQueueFailed()
//     async onError(job: ScrapingWorkerProcessorType, err: Error): Promise<void> {
//         const scrapingJobId = job.id.toString();
//         const meta = err instanceof CustomError ? err.data : { name: err?.name, stack: err?.stack };
//         this.logger.error(`[${this.workerProcessName}] Job ${scrapingJobId} failed. Error: ${err?.message}`, meta);

//         this.eventEmitter.emit(SCRAPING_JOB_LOG_EVENTS.ALL, {
//             meta,
//             scrapingJobId,
//             message: err?.message,
//             logLevel: LogLevelTypesEnum.ERROR,
//         });
//         if (job.attemptsMade >= job.opts.attempts) {
//             await this.priceMatrixService.sendLatestPriceHistorySnapshotUpdate(job.data.dataProviderProductId, ScrapeStatusEnum.ERROR);
//         }
//     }

//     private async updateScrapingJob(job: ScrapingWorkerProcessorType, status: ScrapingJobStatus): Promise<boolean> {
//         const scrapingJobId = job.id.toString();

//         switch (status) {
//             case ScrapingJobStatus.PROCESSING:
//                 return await this.scrapingJobService.updatePartial(scrapingJobId, {
//                     startedAt: UtilsService.getUtcNow(),
//                     status: ScrapingJobStatus.PROCESSING,
//                 });

//             case ScrapingJobStatus.COMPLETED:
//                 return await this.scrapingJobService.updatePartial(scrapingJobId, {
//                     retryCount: job.attemptsMade,
//                     finishedAt: UtilsService.getUtcNow(),
//                     status: ScrapingJobStatus.COMPLETED,
//                 });

//             case ScrapingJobStatus.FAILED:
//                 return await this.scrapingJobService.updatePartial(scrapingJobId, {
//                     retryCount: job.attemptsMade,
//                     errorMessage: job.failedReason,
//                     status: ScrapingJobStatus.FAILED,
//                 });
//         }
//     }

//     private async _createPriceHistory(
//         price: number,
//         regularPrice: number,
//         scrapingJobId: string,
//         productExtractData: ScrapeProductPriceResponseDto,
//     ): Promise<PriceHistoryEntity> {
//         // Only include basic metadata
//         const extractedDataResult = Object.assign(productExtractData.extractedDataResult, { scrapingJobId });

//         const priceHistoryRequest = new CreatePriceHistoryDto({
//             price,
//             regularPrice,
//             metadata: extractedDataResult,
//             status: ScrapeStatusEnum.SUCCESS,
//             image: productExtractData.image,
//             rawHtml: productExtractData.html,
//             errorMessage: productExtractData.error,
//             currency: productExtractData.expectedCurrency,
//             dataProviderProductId: productExtractData.dataProviderProductId,
//         });

//         const priceHistory = await this.priceHistoryService.createPriceHistory(priceHistoryRequest);
//         return priceHistory;
//     }
// }
