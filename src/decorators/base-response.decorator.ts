import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { ResponseDto } from '../common/dto/response.dto';

export type ResponseDtoType = Type<unknown> | [Type<unknown>];

const getSchemaProperty = (dataDto: Type<unknown>, isArray: boolean) => {
    if (isArray) {
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

export const BaseApiOkResponse = (dataDto: ResponseDtoType) => {
    const isArray = Array.isArray(dataDto);
    const targetDto = isArray ? dataDto[0] : dataDto;

    return applyDecorators(
        ApiExtraModels(ResponseDto, targetDto),
        ApiOkResponse({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponseDto) },
                    {
                        properties: {
                            data: getSchemaProperty(targetDto, isArray),
                        },
                    },
                ],
            },
        }),
    );
};
