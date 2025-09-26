'use strict';

export interface ISwaggerConfigInterface {
    path: string;
    title: string;
    version: string;
    scheme: 'http' | 'https';
    description?: string;
}
