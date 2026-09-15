import * as assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { createOnvifProbeMessage, createUniversalProbeMessage } from '../../constants';
import { NetworkDeviceType } from '../../enums';
import { ProtocolAuthApproachService } from '../network-device-approach';

describe('ProtocolAuthApproachService (ONVIF Probe & Auth)', () => {
    let service: ProtocolAuthApproachService;
    const mockLogger: any = {
        log: () => {},
        error: () => {},
        warn: () => {},
    };

    beforeEach(() => {
        service = new ProtocolAuthApproachService(mockLogger);
    });

    describe('XML Probe Creation', () => {
        it('should generate valid WS-Discovery compliant SOAP probe message', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const xml = createOnvifProbeMessage(uuid);

            assert.ok(xml.includes('xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"'));
            assert.ok(xml.includes('<d:Probe>'));
            assert.ok(xml.includes('<d:Types>dn:NetworkVideoTransmitter tds:Device</d:Types>'));
            assert.ok(xml.includes(`uuid:${uuid}`));
        });

        it('should generate valid universal WS-Discovery probe message', () => {
            const uuid = '87654321-4321-4321-4321-cba987654321';
            const xml = createUniversalProbeMessage(uuid);

            assert.ok(xml.includes('xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"'));
            assert.ok(xml.includes('<d:Probe/>'));
            assert.ok(xml.includes(`uuid:${uuid}`));
        });
    });

    describe('XML Parsing (parseOnvifXml)', () => {
        it('should correctly parse ONVIF XML with namespaces', () => {
            const xml = `
                <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope" xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery">
                    <SOAP-ENV:Body>
                        <wsd:ProbeMatches>
                            <wsd:ProbeMatch>
                                <wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>
                                <wsd:Scopes>onvif://www.onvif.org/name/Hikvision onvif://www.onvif.org/model/DS-2CD2043G2-I</wsd:Scopes>
                                <wsd:XAddrs>http://192.168.1.50:80/onvif/device_service https://192.168.1.50:443/onvif/device_service</wsd:XAddrs>
                            </wsd:ProbeMatch>
                        </wsd:ProbeMatches>
                    </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>
            `;

            const metadata = service.parseOnvifXml(xml);
            assert.strictEqual(metadata.types, 'dn:NetworkVideoTransmitter');
            assert.deepStrictEqual(metadata.scopes, ['onvif://www.onvif.org/name/Hikvision', 'onvif://www.onvif.org/model/DS-2CD2043G2-I']);
            assert.deepStrictEqual(metadata.xAddrs, [
                'http://192.168.1.50:80/onvif/device_service',
                'https://192.168.1.50:443/onvif/device_service',
            ]);
        });

        it('should correctly parse XML without namespace prefixes', () => {
            const xml = `
                <Envelope>
                    <Body>
                        <ProbeMatches>
                            <ProbeMatch>
                                <Types>Device</Types>
                                <Scopes>onvif://www.onvif.org/name/Dahua</Scopes>
                                <XAddrs>http://192.168.1.60:8000/onvif/device_service</XAddrs>
                            </ProbeMatch>
                        </ProbeMatches>
                    </Body>
                </Envelope>
            `;

            const metadata = service.parseOnvifXml(xml);
            assert.strictEqual(metadata.types, 'Device');
            assert.deepStrictEqual(metadata.scopes, ['onvif://www.onvif.org/name/Dahua']);
            assert.deepStrictEqual(metadata.xAddrs, ['http://192.168.1.60:8000/onvif/device_service']);
        });
    });

    describe('Device Type Inference', () => {
        it('should classify camera correctly when types or scopes contain camera indicators', () => {
            const cam1 = service.inferDeviceType({
                types: 'dn:NetworkVideoTransmitter',
                scopes: ['onvif://www.onvif.org/name/Hikvision'],
            });
            assert.strictEqual(cam1, NetworkDeviceType.CAMERA);

            const cam2 = service.inferDeviceType({
                types: 'Device',
                scopes: ['onvif://www.onvif.org/name/Dahua', 'onvif://www.onvif.org/hardware/IPCamera'],
            });
            assert.strictEqual(cam2, NetworkDeviceType.CAMERA);
        });

        it('should classify printer correctly when types contain print device type', () => {
            const printer = service.inferDeviceType({
                types: 'wsdp:Device wprt:PrintDeviceType',
                xAddrs: ['http://192.168.1.222:53000'],
            });
            assert.strictEqual(printer, NetworkDeviceType.PRINTER);
        });

        it('should fallback to SMART_IOT if generic device', () => {
            const iot = service.inferDeviceType({
                types: 'GenericDevice',
            });
            assert.strictEqual(iot, NetworkDeviceType.SMART_IOT);
        });
    });

    describe('Broadcast Calculation', () => {
        it('should calculate correct broadcast address from IP and netmask', () => {
            const bcast = service.calculateBroadcastAddress('192.168.1.125', '255.255.255.0');
            assert.strictEqual(bcast, '192.168.1.255');
        });

        it('should parse CIDR subnet and compute broadcast address', () => {
            const bcast = service.parseSubnetBroadcast('192.168.10.0/24');
            assert.strictEqual(bcast, '192.168.10.255');
        });

        it('should parse plain IP subnet and compute /24 broadcast', () => {
            const bcast = service.parseSubnetBroadcast('10.0.0.0');
            assert.strictEqual(bcast, '10.0.0.255');
        });

        it('should resolve broadcast and multicast targets including local interfaces', () => {
            const targets = service.resolveBroadcastAndMulticastTargets('192.168.1.0/24');
            assert.ok(targets.includes('239.255.255.250'));
            assert.ok(targets.includes('255.255.255.255'));
            assert.ok(targets.includes('192.168.1.255'));
        });
    });
});
