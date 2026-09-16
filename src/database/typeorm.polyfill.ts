'use strict';

import { Brackets, ObjectLiteral, QueryBuilder, QueryRunner, UpdateQueryBuilder, UpdateResult } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { QueryExpressionMap } from 'typeorm/query-builder/QueryExpressionMap';
import { ReturningResultsEntityUpdator } from 'typeorm/query-builder/ReturningResultsEntityUpdator';

declare module 'typeorm' {
    interface EntityMetadata {
        updateSql: string;
        parameters: any[];
    }
}

UpdateQueryBuilder.prototype.execute = async function () {
    const queryRunner: QueryRunner = this.obtainQueryRunner();
    let transactionStartedByUs = false;

    try {
        // start transaction if it was enabled
        if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
            await queryRunner.startTransaction();
            transactionStartedByUs = true;
        }

        // call before updation methods in listeners and subscribers
        if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
            await queryRunner.broadcaster.broadcast('BeforeUpdate', this.expressionMap.mainAlias!.metadata, this.expressionMap.valuesSet);
        }

        // eslint-disable-next-line prefer-const
        let declareSql: string | null = null;
        // eslint-disable-next-line prefer-const
        let selectOutputSql: string | null = null;

        // if update entity mode is enabled we may need extra columns for the returning statement
        const returningResultsEntityUpdator = new ReturningResultsEntityUpdator(queryRunner, this.expressionMap);

        const returningColumns: ColumnMetadata[] = [];

        if (Array.isArray(this.expressionMap.returning) && this.expressionMap.mainAlias!.hasMetadata) {
            for (const columnPath of this.expressionMap.returning) {
                returningColumns.push(...this.expressionMap.mainAlias!.metadata.findColumnsWithPropertyPath(columnPath));
            }
        }

        if (
            this.expressionMap.updateEntity === true &&
            this.expressionMap.mainAlias!.hasMetadata &&
            this.expressionMap.whereEntities.length > 0
        ) {
            this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getUpdationReturningColumns();

            returningColumns.push(...this.expressionMap.extraReturningColumns.filter((c) => !returningColumns.includes(c)));
        }

        // execute update query
        const [updateSql, parameters] = this.getQueryAndParameters();

        const statements = [declareSql, updateSql, selectOutputSql];
        const queryResult = await queryRunner.query(statements.filter((sql) => sql != null).join(';\n\n'), parameters, true);
        const updateResult = UpdateResult.from(queryResult);

        // if we are updating entities and entity updation is enabled we must update some of entity columns (like version, update date, etc.)
        if (
            this.expressionMap.updateEntity === true &&
            this.expressionMap.mainAlias!.hasMetadata &&
            this.expressionMap.whereEntities.length > 0
        ) {
            await returningResultsEntityUpdator.update(updateResult, this.expressionMap.whereEntities);
        }

        // call after updation methods in listeners and subscribers
        if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
            await queryRunner.broadcaster.broadcast(
                'AfterUpdate',
                Object.assign(this.expressionMap.mainAlias!.metadata, { updateSql, parameters }),
                this.expressionMap.valuesSet,
            );
        }

        // close transaction if we started it
        if (transactionStartedByUs) await queryRunner.commitTransaction();

        return updateResult;
    } catch (error) {
        // rollback transaction if we started it
        if (transactionStartedByUs) {
            try {
                await queryRunner.rollbackTransaction();
                // eslint-disable-next-line no-empty
            } catch (rollbackError) {}
        }
        throw error;
    } finally {
        if (queryRunner !== this.queryRunner) {
            // means we created our own query runner
            await queryRunner.release();
        }
    }
};
