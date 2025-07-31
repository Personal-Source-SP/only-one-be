import { FindOptionsWhere, Not, ObjectLiteral, Repository } from 'typeorm';

export class UniqueHelper {
    static async checkUniqueByField<TEntity extends ObjectLiteral>(params: {
        repository: Repository<TEntity>;
        uniqueValues: FindOptionsWhere<TEntity>;
        id?: string;
    }): Promise<boolean> {
        // console.log(repository);

        const { repository, uniqueValues, id } = params;

        if (id) {
            const count = await repository.countBy({
                id: Not(id),
                ...uniqueValues,
            });

            return count === 0;
        }

        const count = await repository.countBy({
            ...uniqueValues,
        });

        return count === 0;
    }
}
