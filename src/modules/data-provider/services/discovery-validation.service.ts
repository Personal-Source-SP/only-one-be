import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from '../entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import {
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationBatchStatus,
    ValidationMatchResult,
    ValidationUserAction,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';

@Injectable()
export class DiscoveryValidationService {
    constructor(
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepo: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoveryValidationBatchEntity)
        private readonly batchRepo: Repository<DiscoveryValidationBatchEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepo: Repository<DiscoveryValidationLogEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepo: Repository<DiscoverySessionEntity>,
        private readonly dataSource: DataSource,
    ) {}

    async startBatchValidation(sessionId: string, targetKeyword?: string): Promise<DiscoveryValidationBatchEntity> {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: ['dataProvider'],
        });
        if (!session) throw new NotFoundException('Discovery session not found');

        const urls = await this.urlRepo.find({ where: { sessionId } });
        if (!urls.length) throw new BadRequestException('No discovered URLs found for session');

        const batchNumber = `BATCH-${Date.now()}`;
        const batch = this.batchRepo.create({
            sessionId,
            batchNumber,
            status: ValidationBatchStatus.PROCESSING,
            totalUrls: urls.length,
            startedAt: new Date(),
        });
        await this.batchRepo.save(batch);

        // Mark existing logs as not latest
        await this.logRepo.update({ sessionId }, { isLatestLog: false });

        let matchedCount = 0;
        let noMatchCount = 0;
        const logEntries: DiscoveryValidationLogEntity[] = [];

        for (const urlEntity of urls) {
            const startTime = Date.now();
            const evalResult = DiscoveryValidationHelper.evaluateUrl({
                url: urlEntity.url,
                title: urlEntity.title,
                targetKeyword,
                domain: urlEntity.domain,
            });

            urlEntity.confidenceScore = evalResult.confidenceScore;
            urlEntity.matchResult = evalResult.matchResult;
            urlEntity.validationStatus = DiscoveryValidationStatus.COMPLETED;
            urlEntity.priceDetected = evalResult.priceDetected;
            urlEntity.detectedPrice = evalResult.detectedPrice;
            urlEntity.detectedCurrency = evalResult.detectedCurrency;

            if (
                evalResult.matchResult === ValidationMatchResult.EXACT_MATCH ||
                evalResult.matchResult === ValidationMatchResult.PARTIAL_MATCH
            ) {
                matchedCount++;
            } else {
                noMatchCount++;
            }

            logEntries.push(
                this.logRepo.create({
                    sessionId,
                    discoveryUrlId: urlEntity.id,
                    validationBatchId: batch.id,
                    operationStatus: 'completed',
                    matchResult: evalResult.matchResult,
                    confidenceScore: evalResult.confidenceScore,
                    reason: evalResult.reason,
                    matchedCriteria: evalResult.matchedCriteria,
                    processingDuration: Date.now() - startTime,
                    isLatestLog: true,
                }),
            );
        }

        await this.dataSource.transaction(async (manager) => {
            await manager.save(DiscoveryUrlEntity, urls);
            await manager.save(DiscoveryValidationLogEntity, logEntries);
            await manager.update(DiscoveryValidationBatchEntity, batch.id, {
                status: ValidationBatchStatus.COMPLETED,
                processedUrls: urls.length,
                matchedUrls: matchedCount,
                noMatchUrls: noMatchCount,
                completedAt: new Date(),
            });
            await manager.update(DiscoverySessionEntity, sessionId, {
                totalValidated: urls.length,
            });
        });

        return batch;
    }

    async cancelValidationBatch(batchId: string, reason?: string): Promise<boolean> {
        const batch = await this.batchRepo.findOne({ where: { id: batchId } });
        if (!batch) throw new NotFoundException('Validation batch not found');

        if ([ValidationBatchStatus.COMPLETED, ValidationBatchStatus.CANCELLED].includes(batch.status)) {
            throw new BadRequestException('Batch is already finished or cancelled');
        }

        await this.batchRepo.update(batchId, {
            status: ValidationBatchStatus.CANCELLED,
            reasonCancelled: reason,
        });
        return true;
    }

    async revalidateDiscoveredUrl(urlId: string, targetKeyword?: string): Promise<DiscoveryUrlEntity> {
        const urlEntity = await this.urlRepo.findOne({ where: { id: urlId } });
        if (!urlEntity) throw new NotFoundException('Discovered URL not found');

        const startTime = Date.now();
        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            url: urlEntity.url,
            title: urlEntity.title,
            targetKeyword,
            domain: urlEntity.domain,
        });

        urlEntity.confidenceScore = evalResult.confidenceScore;
        urlEntity.matchResult = evalResult.matchResult;
        urlEntity.validationStatus = DiscoveryValidationStatus.COMPLETED;
        urlEntity.priceDetected = evalResult.priceDetected;
        urlEntity.detectedPrice = evalResult.detectedPrice;
        urlEntity.detectedCurrency = evalResult.detectedCurrency;

        await this.logRepo.update({ discoveryUrlId: urlId }, { isLatestLog: false });

        const log = this.logRepo.create({
            sessionId: urlEntity.sessionId,
            discoveryUrlId: urlEntity.id,
            validationBatchId: urlEntity.sessionId, // Fallback if single
            operationStatus: 'completed',
            matchResult: evalResult.matchResult,
            confidenceScore: evalResult.confidenceScore,
            reason: `Revalidation: ${evalResult.reason}`,
            matchedCriteria: evalResult.matchedCriteria,
            processingDuration: Date.now() - startTime,
            isLatestLog: true,
        });

        await this.dataSource.transaction(async (manager) => {
            await manager.save(DiscoveryUrlEntity, urlEntity);
            await manager.save(DiscoveryValidationLogEntity, log);
        });

        return urlEntity;
    }

    async submitUserAction(urlId: string, action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus = action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        const result = await this.urlRepo.update(urlId, {
            userAction: action,
            userActionDate: new Date(),
            userActionReason: reason,
            finalValidationStatus: finalStatus,
        });
        return (result.affected ?? 0) > 0;
    }

    async submitBulkUserActions(urlIds: string[], action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus = action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        const result = await this.urlRepo.update(
            { id: In(urlIds) },
            {
                userAction: action,
                userActionDate: new Date(),
                userActionReason: reason,
                finalValidationStatus: finalStatus,
            },
        );
        return (result.affected ?? 0) > 0;
    }

    async getLatestValidationBatch(sessionId: string): Promise<DiscoveryValidationBatchEntity | null> {
        return await this.batchRepo.findOne({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });
    }
}
