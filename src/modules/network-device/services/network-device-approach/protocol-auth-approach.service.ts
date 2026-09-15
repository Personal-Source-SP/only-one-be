import * as crypto from 'node:crypto';
import * as dgram from 'node:dgram';

import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { LoggerService } from '../../../../shared/services/logger.service';
import {
    createOnvifProbeMessage,
    createUniversalProbeMessage,
    DEFAULT_CAMERA_CREDENTIALS,
    DEFAULT_ONVIF_PROBE_TIMEOUT_MS,
    ONVIF_MULTICAST_PORT,
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
    IProbeService,
} from '../../interfaces';

@Injectable()
export class ProtocolAuthApproachService implements IProbeService, INetworkDeviceApproachService {
    constructor(private readonly loggerService: LoggerService) {}

    async execute(target: INetworkDeviceTarget = {}, options?: any): Promise<INetworkDeviceApproachResult> {
        const startTime = Date.now();
        try {
            if (target.ip) {
                return await this.verifyCameraCredentials(target, target.credentials);
            }

            const devices = await this.probe(target.subnet, options?.timeoutMs ?? 3000);

            return {
                isSuccess: true,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                data: devices,
                responseTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                responseTimeMs: Date.now() - startTime,
                errorMessage: error.message || 'Lỗi trong quá trình Protocol Auth',
            };
        }
    }

    async verifyCameraCredentials(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>> {
        const startTime = Date.now();
        const candidateCredentials = credentials && credentials.length > 0 ? credentials : DEFAULT_CAMERA_CREDENTIALS;

        if (!target.ip) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                responseTimeMs: Date.now() - startTime,
                errorMessage: 'Target IP bắt buộc phải được cung cấp để xác thực thiết bị.',
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
                        isSuccess: true,
                        approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                        target,
                        matchedCredential: cred,
                        data: {
                            deviceInfo: deviceInfo || undefined,
                            snapshotUri: snapshotUri || undefined,
                            rtspStreamUri: rtspStreamUri || undefined,
                            liveViewSupported: Boolean(rtspStreamUri),
                        },
                        responseTimeMs: Date.now() - startTime,
                    };
                }
            } catch (err: any) {
                this.loggerService.warn(`Auth attempt failed for ${target.ip} with user ${cred.username}: ${err.message}`);
            }
        }

        return {
            isSuccess: false,
            approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
            target,
            responseTimeMs: Date.now() - startTime,
            errorMessage: 'Không có tài khoản / mật khẩu nào xác thực thành công.',
        };
    }

    async fetchSnapshot(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null> {
        if (!target.ip) return null;
        const testPaths = ['/onvif-http/snapshot', '/cgi-bin/snapshot.cgi', '/snap.jpg', '/image.jpg'];
        for (const path of testPaths) {
            try {
                const url = `http://${target.ip}${path}`;
                const res = await axios.get(url, {
                    auth: credential?.username ? { username: credential.username, password: credential.password || '' } : undefined,
                    timeout: 2000,
                    responseType: 'arraybuffer',
                });
                if (res.status === 200 && res.data) {
                    const contentType = res.headers['content-type'] || 'image/jpeg';
                    const base64 = Buffer.from(res.data).toString('base64');
                    return `data:${contentType};base64,${base64}`;
                }
            } catch {
                // Tiếp tục thử đường dẫn tiếp theo
            }
        }
        return null;
    }

    async fetchStreamUri(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null> {
        if (!target.ip) return null;
        const authPart = credential?.username ? `${credential.username}:${credential.password || ''}@` : '';
        return `rtsp://${authPart}${target.ip}:554/live/ch0`;
    }

    async fetchDeviceInfo(target: INetworkDeviceTarget, _credential?: IDeviceCredential): Promise<ICameraDeviceInfo | null> {
        if (!target.ip) return null;
        return {
            manufacturer: 'Generic Camera',
            model: 'IP Camera',
            firmwareVersion: '1.0.0',
        };
    }

    private async tryAuthenticate(ip: string, cred: IDeviceCredential): Promise<boolean> {
        const testUrls = [`http://${ip}/onvif/device_service`, `http://${ip}/cgi-bin/snapshot.cgi`, `http://${ip}/`];
        for (const url of testUrls) {
            try {
                const res = await axios.get(url, {
                    auth: { username: cred.username, password: cred.password || '' },
                    timeout: 1500,
                    validateStatus: (status) => status < 400 || status === 401,
                });
                if (res.status < 400) {
                    return true;
                }
            } catch {
                // Bỏ qua lỗi kết nối
            }
        }
        return false;
    }

    async probe(subnet?: string, timeoutMs = DEFAULT_ONVIF_PROBE_TIMEOUT_MS): Promise<NetworkDeviceDto[]> {
        return new Promise((resolve) => {
            const discoveredMap = new Map<string, NetworkDeviceDto>();
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            const messageId = crypto.randomUUID();
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
                    const openPorts = OnvifXmlParserHelper.extractOpenPorts(metadata, rinfo.port);
                    const deviceType = OnvifXmlParserHelper.inferDeviceType(metadata);
                    const vendor = OnvifXmlParserHelper.extractVendorFromScopes(metadata.scopes);
                    const model = OnvifXmlParserHelper.extractModelFromScopes(metadata.scopes);

                    const device = new NetworkDeviceDto({
                        ipAddress: ip,
                        deviceType,
                        vendor,
                        model,
                        openPorts,
                        onvifMetadata: metadata,
                        isOnline: true,
                        lastSeenAt: new Date(),
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
                    client.setMulticastTTL(128);

                    const targetIps = NetworkSubnetHelper.resolveBroadcastAndMulticastTargets(subnet);
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
}
