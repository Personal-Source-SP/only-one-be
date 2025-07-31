import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { ResponseDto } from '../common/dto/response.dto';

export const BaseApiOkResponse = <DataDto extends Type<unknown>>(dataDto: DataDto) =>
    applyDecorators(
        ApiExtraModels(ResponseDto, dataDto),
        ApiOkResponse({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponseDto) },
                    {
                        properties: {
                            data: Array.isArray(dataDto)
                                ? {
                                      type: 'array',
                                      items: {
                                          $ref: getSchemaPath(dataDto[0]),
                                      },
                                  }
                                : ['string', 'boolean', 'number'].includes(dataDto.name.toLocaleLowerCase())
                                  ? {
                                        type: dataDto.name.toLocaleLowerCase(),
                                    }
                                  : {
                                        type: 'object',
                                        $ref: getSchemaPath(dataDto),
                                    },
                        },
                    },
                ],
            },
        }),
    );
