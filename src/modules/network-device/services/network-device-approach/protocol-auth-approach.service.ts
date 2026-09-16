import * as crypto from 'node:crypto';
import * as dgram from 'node:dgram';

import { Injectable } from '@nestjs/common';

import { BaseHttpService } from '../../../../shared/services/base-http.service';
import { LoggerService } from '../../../../shared/services/logger.service';
import {
    CAMERA_AUTH_PROBE_PATHS,
    CAMERA_SNAPSHOT_PATHS,
    createOnvifProbeMessage,
    createUniversalProbeMessage,
    DEFAULT_CAMERA_CREDENTIALS,
    DEFAULT_CAMERA_FIRMWARE_VERSION,
    DEFAULT_CAMERA_MANUFACTURER,
    DEFAULT_CAMERA_MODEL,
    DEFAULT_ONVIF_PROBE_TIMEOUT_MS,
    DEFAULT_PROTOCOL_AUTH_TIMEOUT_MS,
    DEFAULT_RTSP_PATH,
    DEFAULT_RTSP_PORT,
    DEFAULT_SNAPSHOT_CONTENT_TYPE,
    DEFAULT_SNAPSHOT_TIMEOUT_MS,
    NetworkDeviceError,
    ONVIF_MULTICAST_PORT,
    ONVIF_MULTICAST_TTL,
} from '../../constants';
import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum } from '../../enums';
import { NetworkSubnetHelper, OnvifXmlParserHelper } from '../../helpers';
import {
    ICameraDeviceInfo,
    ICameraVerificationData,
    IDeviceCredential,
    INetworkDeviceApproachResult,
    INetworkDeviceApproachService,
    INetworkDeviceTarget,
    INetworkScanOptions,
} from '../../interfaces';

@Injectable()
export class ProtocolAuthApproachService implements INetworkDeviceApproachService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly baseHttpService: BaseHttpService,
    ) {}

    async scan(options: INetworkScanOptions = {}): Promise<NetworkDeviceDto[]> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_ONVIF_PROBE_TIMEOUT_MS;

        return new Promise((resolve) => {
            const discoveredMap = new Map<string, NetworkDeviceDto>();

            const messageId = crypto.randomUUID();
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            const probeMessages = [createOnvifProbeMessage(messageId), createUniversalProbeMessage(crypto.randomUUID())];

            const timer = setTimeout(() => cleanup(), timeoutMs);

            const cleanup = () => {
                try {
                    clearTimeout(timer);
                    client.close();
                } catch {
                    // Ignore socket close exceptions
                }
                resolve(Array.from(discoveredMap.values()));
            };

            client.on('error', (err) => {
                this.loggerService.error(`ONVIF Probe UDP socket error: ${err.message}`);
                cleanup();
            });

            client.on('message', (msg, rinfo) => {
                try {
                    const rawXml = msg.toString('utf8');
                    const ip = rinfo.address;

                    const metadata = OnvifXmlParserHelper.parseOnvifXml(rawXml);
                    const deviceType = OnvifXmlParserHelper.inferDeviceType(metadata);
                    const model = OnvifXmlParserHelper.extractModelFromScopes(metadata.scopes);
                    const vendor = OnvifXmlParserHelper.extractVendorFromScopes(metadata.scopes);
                    const openPorts = OnvifXmlParserHelper.extractOpenPorts(metadata, rinfo.port);

                    const device = new NetworkDeviceDto({
                        model,
                        vendor,
                        openPorts,
                        deviceType,
                        ipAddress: ip,
                        isOnline: true,
                        lastSeenAt: new Date(),
                        onvifMetadata: metadata,
                    });

                    discoveredMap.set(ip, device);
                    this.loggerService.log(
                        `ONVIF/WS-Discovery device discovered: ${ip} (${device.vendor || 'Unknown Vendor'}, Type: ${deviceType})`,
                    );
                } catch (err) {
                    this.loggerService.error(`Failed to parse ONVIF message from ${rinfo.address}: ${err.message}`);
                }
            });

            client.bind(0, () => {
                try {
                    client.setBroadcast(true);
                    client.setMulticastTTL(ONVIF_MULTICAST_TTL);

                    const targetIps = NetworkSubnetHelper.resolveBroadcastAndMulticastTargets(options.subnet);
                    for (const probeMessage of probeMessages) {
                        const buffer = Buffer.from(probeMessage, 'utf8');
                        for (const targetIp of targetIps) {
                            client.send(buffer, 0, buffer.length, ONVIF_MULTICAST_PORT, targetIp, (err) => {
                                if (err) {
                                    this.loggerService.warn(`Failed to send ONVIF probe packet to ${targetIp}: ${err.message}`);
                                }
                            });
                        }
                    }
                } catch (e) {
                    this.loggerService.error(`Error configuring UDP socket: ${e.message}`);
                    cleanup();
                }
            });
        });
    }

    async verifyCameraCredentials(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>> {
        const startTime = Date.now();
        const candidateCredentials = credentials?.length ? credentials : DEFAULT_CAMERA_CREDENTIALS;

        if (!target.ip) {
            return {
                target,
                isSuccess: false,
                responseTimeMs: Date.now() - startTime,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                errorMessage: NetworkDeviceError.TargetIpRequired.message,
            };
        }

        for (const cred of candidateCredentials) {
            try {
                const verified = await this.tryAuthenticate(target.ip, cred);
                if (verified) {
                    const deviceInfo = await this.fetchDeviceInfo(target, cred);
                    const snapshotUri = await this.fetchSnapshot(target, cred);
                    const rtspStreamUri = await this.fetchStreamUri(target, cred);

                    return {
                        target,
                        isSuccess: true,
                        matchedCredential: cred,
                        responseTimeMs: Date.now() - startTime,
                        approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                        data: {
                            deviceInfo: deviceInfo || undefined,
                            snapshotUri: snapshotUri || undefined,
                            rtspStreamUri: rtspStreamUri || undefined,
                            liveViewSupported: Boolean(rtspStreamUri),
                        },
                    };
                }
            } catch (err: any) {
                this.loggerService.warn(`Auth attempt failed for ${target.ip} with user ${cred.username}: ${err?.message || err}`);
            }
        }

        return {
            target,
            isSuccess: false,
            responseTimeMs: Date.now() - startTime,
            approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
            errorMessage: NetworkDeviceError.CameraAuthFailed.message,
        };
    }

    async fetchSnapshot(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null> {
        if (!target.ip) return null;

        for (const path of CAMERA_SNAPSHOT_PATHS) {
            try {
                const url = `http://${target.ip}${path}`;
                const res = await this.baseHttpService.get<ArrayBuffer>(url, {
                    timeout: DEFAULT_SNAPSHOT_TIMEOUT_MS,
                    responseType: 'arraybuffer',
                    auth: credential?.username ? { username: credential.username, password: credential.password || '' } : undefined,
                });

                if (res.status === 200 && res.data) {
                    const contentType = res.headers?.['content-type'] || DEFAULT_SNAPSHOT_CONTENT_TYPE;
                    const base64 = Buffer.from(res.data).toString('base64');
                    return `data:${contentType};base64,${base64}`;
                }
            } catch (err: any) {
                this.loggerService.debug(`Snapshot fetch failed on ${target.ip}${path}: ${err?.message || err}`);
            }
        }

        return null;
    }

    async fetchStreamUri(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null> {
        if (!target.ip) return null;

        const authPart = credential?.username ? `${credential.username}:${credential.password || ''}@` : '';
        return `rtsp://${authPart}${target.ip}:${DEFAULT_RTSP_PORT}${DEFAULT_RTSP_PATH}`;
    }

    async fetchDeviceInfo(target: INetworkDeviceTarget, _credential?: IDeviceCredential): Promise<ICameraDeviceInfo | null> {
        if (!target.ip) return null;

        return {
            model: DEFAULT_CAMERA_MODEL,
            firmwareVersion: DEFAULT_CAMERA_FIRMWARE_VERSION,
            manufacturer: DEFAULT_CAMERA_MANUFACTURER,
        };
    }

    private async tryAuthenticate(ip: string, cred: IDeviceCredential): Promise<boolean> {
        for (const path of CAMERA_AUTH_PROBE_PATHS) {
            try {
                const url = `http://${ip}${path}`;
                const res = await this.baseHttpService.get(url, {
                    timeout: DEFAULT_PROTOCOL_AUTH_TIMEOUT_MS,
                    validateStatus: (status) => status < 400 || status === 401,
                    auth: { username: cred.username, password: cred.password || '' },
                });

                if (res.status < 400) return true;
            } catch (err: any) {
                this.loggerService.debug(`Auth probe failed for ${ip}${path} (user: ${cred.username}): ${err?.message || err}`);
            }
        }
        return false;
    }
}
