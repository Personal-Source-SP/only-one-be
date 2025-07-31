import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { ResponseDto } from '../common/dto/response.dto';

type DataDto = Type<unknown>;
type BaseApiOkResponseOptions = {
    isArray: boolean;
};

const getSchemaProperty = (dataDto: DataDto, options?: BaseApiOkResponseOptions) => {
    if (options?.isArray) {
        return {
            type: 'array',
            items: {
                $ref: getSchemaPath(dataDto),
            },
        };
    }

    if (['string', 'boolean', 'number'].includes(dataDto.name.toLocaleLowerCase())) {
        return {
            type: dataDto.name.toLocaleLowerCase(),
        };
    }

    return {
        type: 'object',
        $ref: getSchemaPath(dataDto),
    };
};

export const BaseApiOkResponse = <DataDto extends Type<unknown>>(dataDto: DataDto, options?: BaseApiOkResponseOptions) =>
    applyDecorators(
        ApiExtraModels(ResponseDto, dataDto),
        ApiOkResponse({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponseDto) },
                    {
                        properties: {
                            data: getSchemaProperty(dataDto, options),
                        },
                    },
                ],
            },
        }),
    );
