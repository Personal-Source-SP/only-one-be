import { Injectable } from '@nestjs/common';
import cluster from 'cluster';
import { isNumber } from 'lodash';
import { cpus } from 'os';

const numCPUs = cpus().length;

export class AppClusterService {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static clusterize(callback: Function): void {
        const numberOfProcess = Number(process.env.NODE_CLUSTER_PROCESS) > 0 ? Number(process.env.NODE_CLUSTER_PROCESS) : numCPUs;
        if (cluster.isPrimary) {
            console.log(`Master server started on ${process.pid}`);
            for (let i = 0; i < numberOfProcess; i++) {
                cluster.fork();
            }
            cluster.on('exit', (worker, code, signal) => {
                console.log(`Worker ${worker.process.pid} died. Restarting`);
                cluster.fork();
            });
        } else {
            console.log(`Cluster server started on ${process.pid}`);
            callback();
        }
    }
}
