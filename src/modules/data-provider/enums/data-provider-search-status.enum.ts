export enum DataProviderSearchStatus {
    READY = 'ready', //  Provider is fully configured and operational for searching
    TESTING = 'testing', // Provider is in test mode (e.g., limited search jobs for validation)
    UNCONFIGURED = 'unconfigured', // Critical configuration is missing (e.g., searchInterval, searchTier)
    ERROR = 'error', // Provider has encountered an error and is not operational
}
