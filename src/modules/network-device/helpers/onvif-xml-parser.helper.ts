import { Injectable } from '@nestjs/common';

import { NetworkDeviceType } from '../enums';
import { IOnvifMetadata } from '../interfaces';

@Injectable()
export class OnvifXmlParserHelper {
    static parseOnvifXml(xml: string): IOnvifMetadata {
        const metadata: IOnvifMetadata = { rawXml: xml };

        const xAddrsMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?XAddrs\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?XAddrs>/i);
        if (xAddrsMatch) {
            metadata.xAddrs = xAddrsMatch[1].trim().split(/\s+/).filter(Boolean);
        }

        const typesMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?Types\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Types>/i);
        if (typesMatch) {
            metadata.types = typesMatch[1].trim();
        }

        const scopesMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?Scopes\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Scopes>/i);
        if (scopesMatch) {
            metadata.scopes = scopesMatch[1].trim().split(/\s+/).filter(Boolean);
        }

        return metadata;
    }

    static inferDeviceType(metadata: IOnvifMetadata): NetworkDeviceType {
        const typesLower = (metadata.types || '').toLowerCase();
        const scopesStr = (metadata.scopes || []).join(' ').toLowerCase();
        const combined = `${typesLower} ${scopesStr}`;

        if (
            combined.includes('networkvideotransmitter') ||
            combined.includes('camera') ||
            combined.includes('videosource') ||
            combined.includes('nvr') ||
            combined.includes('dvr') ||
            combined.includes('axis') ||
            combined.includes('hikvision') ||
            combined.includes('dahua') ||
            combined.includes('uniview') ||
            combined.includes('ezviz') ||
            combined.includes('imou')
        ) {
            return NetworkDeviceType.CAMERA;
        }

        if (combined.includes('printdevicetype') || combined.includes('printer') || combined.includes('print')) {
            return NetworkDeviceType.PRINTER;
        }

        if (
            combined.includes('router') ||
            combined.includes('accesspoint') ||
            combined.includes('gateway') ||
            combined.includes('switch')
        ) {
            return NetworkDeviceType.ROUTER_AP;
        }

        if (metadata.xAddrs?.some((x) => x.toLowerCase().includes('onvif')) || scopesStr.includes('onvif://')) {
            return NetworkDeviceType.CAMERA;
        }

        return NetworkDeviceType.SMART_IOT;
    }

    static extractVendorFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match =
                scope.match(/onvif:\/\/www\.onvif\.org\/name\/([^/\s]+)/i) ||
                scope.match(/onvif:\/\/www\.onvif\.org\/hardware\/([^/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }

    static extractModelFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match = scope.match(/onvif:\/\/www\.onvif\.org\/model\/([^/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }

    static extractOpenPorts(metadata: IOnvifMetadata, defaultPort?: number): number[] {
        const openPorts: number[] = defaultPort ? [defaultPort] : [];
        if (metadata.xAddrs) {
            for (const xAddr of metadata.xAddrs) {
                try {
                    const url = new URL(xAddr);
                    const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
                    if (!openPorts.includes(port)) openPorts.push(port);
                } catch {
                    // Ignore invalid URL
                }
            }
        }
        return openPorts;
    }
}
