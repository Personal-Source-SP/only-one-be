import assert from 'assert';
import { EventEmitter } from 'events';
import { HtmlFetcherService } from '../html-fetcher.service';

class MockHTTPRequest {
    public interceptionHandled = false;
    public aborted = false;
    public continued = false;
    private type: string;

    constructor(type: string, alreadyHandled = false) {
        this.type = type;
        this.interceptionHandled = alreadyHandled;
    }

    resourceType(): string {
        return this.type;
    }

    isInterceptResolutionHandled(): boolean {
        return this.interceptionHandled;
    }

    async continue(): Promise<void> {
        if (this.interceptionHandled) {
            throw new Error('Request is already handled!');
        }
        this.interceptionHandled = true;
        this.continued = true;
    }

    async abort(): Promise<void> {
        if (this.interceptionHandled) {
            throw new Error('Request is already handled!');
        }
        this.interceptionHandled = true;
        this.aborted = true;
    }
}

class MockPage extends EventEmitter {
    public requestInterception = false;
    public userAgent = '';
    public jsEnabled = true;

    async setRequestInterception(value: boolean) {
        this.requestInterception = value;
    }
    async setUserAgent(ua: string) {
        this.userAgent = ua;
    }
    async setJavaScriptEnabled(enabled: boolean) {
        this.jsEnabled = enabled;
    }
    async setExtraHTTPHeaders(_headers: any) {}
    async setCookie(..._cookies: any[]) {}
}

async function runTests() {
    const service = new HtmlFetcherService();

    // Test 1: Both images and CSS disabled -> Single listener, handles requests cleanly without "Request is already handled!"
    const page = new MockPage();
    await (service as any).configurePage(page, {
        imagesEnabled: false,
        cssEnabled: false,
    });

    assert.strictEqual(page.requestInterception, true, 'Request interception should be enabled');
    assert.strictEqual(page.listenerCount('request'), 1, 'Should register exactly ONE request listener');

    // Document request should be continued
    const docReq = new MockHTTPRequest('document');
    page.emit('request', docReq);
    assert.strictEqual(docReq.continued, true, 'Document request should be continued');
    assert.strictEqual(docReq.aborted, false);

    // Image request should be aborted
    const imgReq = new MockHTTPRequest('image');
    page.emit('request', imgReq);
    assert.strictEqual(imgReq.aborted, true, 'Image request should be aborted');

    // Stylesheet request should be aborted
    const cssReq = new MockHTTPRequest('stylesheet');
    page.emit('request', cssReq);
    assert.strictEqual(cssReq.aborted, true, 'Stylesheet request should be aborted');

    // Handled request should be ignored safely
    const handledReq = new MockHTTPRequest('image', true);
    page.emit('request', handledReq);
    // Should not throw

    // Test 2: Only images disabled
    const page2 = new MockPage();
    await (service as any).configurePage(page2, {
        imagesEnabled: false,
        cssEnabled: true,
    });
    assert.strictEqual(page2.listenerCount('request'), 1);
    const cssReq2 = new MockHTTPRequest('stylesheet');
    page2.emit('request', cssReq2);
    assert.strictEqual(cssReq2.continued, true, 'Stylesheet should be continued when cssEnabled is true');

    // Test 3: Neither disabled
    const page3 = new MockPage();
    await (service as any).configurePage(page3, {
        imagesEnabled: true,
        cssEnabled: true,
    });
    assert.strictEqual(page3.requestInterception, false);
    assert.strictEqual(page3.listenerCount('request'), 0, 'No listeners if neither is disabled');

    console.log('✅ ALL REGRESSION TESTS PASSED (GREEN)');
}

runTests().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
