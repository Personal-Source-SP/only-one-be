// relock configuration
export const REDLOCK_CONFIG = {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200,
};

// Lock TTL in milliseconds
export const LOCK_TTL_SECONDS = 120; // 2 minutes

// Lock key
export const SCRAPING_SCHEDULE_LOCK = 'scraping-schedule-lock';
