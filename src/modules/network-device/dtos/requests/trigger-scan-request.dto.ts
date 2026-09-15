import { NumberFieldOptional, StringFieldOptional } from '../../../../decorators';

export class TriggerScanRequestDto {
    @StringFieldOptional({
        description: 'Dải mạng subnet cần quét (VD: 192.168.1). Nếu để trống sẽ tự động phát hiện IP card mạng.',
    })
    subnet?: string;

    @NumberFieldOptional({
        description: 'Thời gian chờ phản hồi UDP probe tính bằng ms (Mặc định: 3000ms)',
        min: 1000,
        max: 10000,
    })
    probeTimeoutMs?: number;
}
