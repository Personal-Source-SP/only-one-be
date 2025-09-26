/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { getMetadataArgsStorage } from 'typeorm';

export function getColumnNames<T>(entity: new () => T, excludeFields: (keyof T)[] = []): (keyof T)[] {
    // Get all prototype chain up to Object.prototype
    const getPrototypes = (target: Function): Function[] => {
        const protos: Function[] = [];
        let currentProto = target;

        while (currentProto && currentProto !== Object.prototype) {
            protos.push(currentProto);
            currentProto = Object.getPrototypeOf(currentProto);
        }

        return protos;
    };

    const metadataStorage = getMetadataArgsStorage();
    const prototypes = getPrototypes(entity);
    // Get columns from the entity and all its parent classes
    const columns = metadataStorage.columns
        .filter((column) => prototypes.includes(column.target as Function))
        .map((column) => column.propertyName);

    return columns.filter((column) => !excludeFields.includes(column as keyof T)) as (keyof T)[];
}

function getRelationEntityType(relation: any): Function {
    if (typeof relation.type === 'function') {
        const typeResult = relation.type();
        return typeResult.prototype ? typeResult : typeResult.constructor;
    }
    return relation.type;
}

export function getRelationColumns<T, R>(entity: new () => T, relationName: keyof T, excludeFields: (keyof R)[] = []): string[] {
    // Get the relation metadata
    const relation = getMetadataArgsStorage().relations.find((rel) => rel.target === entity && rel.propertyName === relationName);

    if (!relation) {
        return [];
    }

    const relationType = getRelationEntityType(relation);

    // Get columns of the related entity
    const relatedColumns = getMetadataArgsStorage()
        .columns.filter((column) => column.target === relationType)
        .map((column) => `${String(relationName)}.${column.propertyName}`);

    // Filter out excluded fields
    return relatedColumns.filter((column) => !excludeFields.includes(column.split('.')[1] as keyof R));
}
