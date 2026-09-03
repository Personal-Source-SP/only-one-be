export enum DiscoveryUrlStatus {
    DISCOVERED = 'discovered',
    QUEUED = 'queued',
    SCRAPED = 'scraped',
    FAILED = 'failed',
    INGESTED = 'ingested',
}

export enum DiscoveryValidationStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
}

export enum ValidationMatchResult {
    EXACT_MATCH = 'exact_match',
    PARTIAL_MATCH = 'partial_match',
    NO_MATCH = 'no_match',
    UNCERTAIN = 'uncertain',
}

export enum ValidationUserAction {
    CONFIRM = 'confirm',
    REJECT = 'reject',
    EXCLUDE = 'exclude',
}

export enum FinalValidationStatus {
    PENDING_REVIEW = 'pending_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum ValidationBatchStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed',
}
