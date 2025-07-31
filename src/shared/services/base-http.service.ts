import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class BaseHttpService {
    constructor(private readonly _httpService: HttpService) {}

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const axiosConfig: any = { ...axios.defaults, ...config };
        const result = this._httpService
            .get(url, axiosConfig)
            .pipe((res) => res)
            .toPromise();

        return result;
    }

    public async post<T>(url: string, body: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const axiosConfig: any = { ...axios.defaults, ...config };
        const result = this._httpService
            .post(url, body, axiosConfig)
            .pipe((res) => res)
            .toPromise();
        return result;
    }

    public async put<T>(url: string, body: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const axiosConfig: any = { ...axios.defaults, ...config };
        const result = this._httpService
            .put(url, body, axiosConfig)
            .pipe((res) => res)
            .toPromise();
        return result;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const axiosConfig: any = { ...axios.defaults, ...config };
        const result = this._httpService
            .delete(url, axiosConfig)
            .pipe((res) => res)
            .toPromise();
        return result;
    }
}
