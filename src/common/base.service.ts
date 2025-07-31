import { BaseEntity, DeleteResult, Repository } from 'typeorm';
import { EntityId } from 'typeorm/repository/EntityId';

export class BaseService<T extends BaseEntity, R extends Repository<T>> {
    protected readonly repository: R;

    constructor(repository: R) {
        this.repository = repository;
    }

    public findAll(): Promise<T[]> {
        return this.repository.find();
    }

    public findById(id: any): Promise<T> {
        return this.repository.findOneBy(id);
    }

    public create(data: any): Promise<T> {
        return this.repository.save(data);
    }

    public async update(id: EntityId, data: T): Promise<T> {
        await this.repository.save(data);
        return this.findById(id);
    }

    public delete(id: EntityId): Promise<DeleteResult> {
        return this.repository.delete(id);
    }
}
