import { AxiosProxyConfig } from 'axios';

/**
 * Parse proxy info from proxy URL
 * Support format:
 * http://username:password@host:port
 * f6d62632f3594fb9d861:0728fec06243a45f@gw.dataimpulse.com:823 = login:password@host:port
 * gw.dataimpulse.com:823@f6d62632f3594fb9d861:0728fec06243a45f = host:port@login:password
 * @param proxyUrl
 * @returns
 */
export const parseProxyInfo = (proxyUrl: string): AxiosProxyConfig | null => {
    if (!proxyUrl) {
        return null;
    }

    const urlPattern = /^(https?:\/\/)?([^:@]+):([^@]+)@([^:]+):(\d+)$/;
    const reversedPattern = /^([^:@]+):(\d+)@([^:@]+):([^@]+)$/;

    let match = proxyUrl.match(urlPattern);
    let reversed = false;

    if (!match) {
        match = proxyUrl.match(reversedPattern);
        reversed = true;
    }

    if (match) {
        return {
            host: reversed ? match[1] : match[4],
            port: parseInt(reversed ? match[2] : match[5], 10),
            auth: {
                username: reversed ? match[3] : match[2],
                password: reversed ? match[4] : match[3],
            },
        };
    }

    return null;
};
