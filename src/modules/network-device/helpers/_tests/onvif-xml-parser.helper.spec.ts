import { NetworkDeviceType } from '../../enums';
import { OnvifXmlParserHelper } from '../onvif-xml-parser.helper';

describe('OnvifXmlParserHelper', () => {
    const sampleXml = `
        <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
            <SOAP-ENV:Body>
                <d:ProbeMatches>
                    <d:ProbeMatch>
                        <d:Types>dn:NetworkVideoTransmitter tds:Device</d:Types>
                        <d:Scopes>onvif://www.onvif.org/type/video_encoder onvif://www.onvif.org/name/Hikvision onvif://www.onvif.org/model/DS-2CD2043G2-I</d:Scopes>
                        <d:XAddrs>http://192.168.1.64:80/onvif/device_service https://192.168.1.64:443/onvif/device_service</d:XAddrs>
                    </d:ProbeMatch>
                </d:ProbeMatches>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>
    `;

    describe('parseOnvifXml', () => {
        it('should extract types, scopes, and xAddrs', () => {
            const metadata = OnvifXmlParserHelper.parseOnvifXml(sampleXml);
            expect(metadata.types).toBe('dn:NetworkVideoTransmitter tds:Device');
            expect(metadata.scopes).toEqual([
                'onvif://www.onvif.org/type/video_encoder',
                'onvif://www.onvif.org/name/Hikvision',
                'onvif://www.onvif.org/model/DS-2CD2043G2-I',
            ]);
            expect(metadata.xAddrs).toEqual([
                'http://192.168.1.64:80/onvif/device_service',
                'https://192.168.1.64:443/onvif/device_service',
            ]);
        });
    });

    describe('inferDeviceType', () => {
        it('should classify as CAMERA when types contain NetworkVideoTransmitter', () => {
            const metadata = OnvifXmlParserHelper.parseOnvifXml(sampleXml);
            const type = OnvifXmlParserHelper.inferDeviceType(metadata);
            expect(type).toBe(NetworkDeviceType.CAMERA);
        });

        it('should classify as PRINTER when scopes contain printer', () => {
            const metadata = { rawXml: '', types: 'PrintDeviceType', scopes: ['printer'] };
            expect(OnvifXmlParserHelper.inferDeviceType(metadata)).toBe(NetworkDeviceType.PRINTER);
        });
    });

    describe('extractVendorFromScopes and extractModelFromScopes', () => {
        it('should extract vendor and model correctly', () => {
            const metadata = OnvifXmlParserHelper.parseOnvifXml(sampleXml);
            expect(OnvifXmlParserHelper.extractVendorFromScopes(metadata.scopes)).toBe('Hikvision');
            expect(OnvifXmlParserHelper.extractModelFromScopes(metadata.scopes)).toBe('DS-2CD2043G2-I');
        });
    });

    describe('extractOpenPorts', () => {
        it('should extract ports from xAddrs and default port', () => {
            const metadata = OnvifXmlParserHelper.parseOnvifXml(sampleXml);
            const ports = OnvifXmlParserHelper.extractOpenPorts(metadata, 3702);
            expect(ports).toEqual([3702, 80, 443]);
        });
    });
});
