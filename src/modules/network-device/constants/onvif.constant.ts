export const ONVIF_MULTICAST_IP = '239.255.255.250';
export const ONVIF_GLOBAL_BROADCAST_IP = '255.255.255.255';
export const ONVIF_MULTICAST_PORT = 3702;
export const DEFAULT_ONVIF_PROBE_TIMEOUT_MS = 3000;

export const createOnvifProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <s:Header>
    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </s:Header>
  <s:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter tds:Device</d:Types>
    </d:Probe>
  </s:Body>
</s:Envelope>`;

export const createUniversalProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
  <s:Header>
    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </s:Header>
  <s:Body>
    <d:Probe/>
  </s:Body>
</s:Envelope>`;
