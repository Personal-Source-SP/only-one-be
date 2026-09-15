export const ONVIF_MULTICAST_IP = '239.255.255.250';
export const ONVIF_MULTICAST_PORT = 3702;
export const DEFAULT_ONVIF_PROBE_TIMEOUT_MS = 3000;

export const createOnvifProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">uuid:${messageId}</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <dn:Probe><dn:Types>dn:NetworkVideoTransmitter</dn:Types></dn:Probe>
  </Body>
</Envelope>`;
