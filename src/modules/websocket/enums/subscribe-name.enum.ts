export enum SubscribeName {
    SCOUT_REQUEST_PROCESSING = 'scoutRequestProcessing',
    SCOUT_REQUEST_PROGRESS = 'scoutRequestProgress',
    SCOUT_REQUEST_COMPLETED = 'scoutRequestCompleted',
    SCOUT_REQUEST_FAILED = 'scoutRequestFailed',
    CONNECTION_ESTABLISHED = 'connectionEstablished',
    CLIENT_JOINED_ROOM = 'clientJoinedRoom',
    CLIENT_LEFT_ROOM = 'clientLeftRoom',
    ERROR_OCCURRED = 'errorOccurred',
    HEARTBEAT = 'heartbeat',
    UPDATE_PRICE_MATRIX = 'updatePriceMatrix',

    // AI Validation Events
    AI_VALIDATION_CREATED = 'aiValidationCreated',
    AI_VALIDATION_STARTED = 'aiValidationStarted',
    AI_VALIDATION_PROGRESS = 'aiValidationProgress',
    AI_VALIDATION_COMPLETED = 'aiValidationCompleted',
    AI_VALIDATION_FAILED = 'aiValidationFailed',
    AI_VALIDATION_CANCELLED = 'aiValidationCancelled',
    AI_URL_VALIDATION_UPDATE = 'aiUrlValidationUpdate',

    // Job Lifecycle Events
    JOB_STARTED = 'jobStarted',
    JOB_PROGRESS = 'jobProgress',
    JOB_COMPLETED = 'jobCompleted',
    JOB_FAILED = 'jobFailed',

    // Notification Events
    NEW_NOTIFICATION = 'newNotification',
}

export enum WebSocketEvent {
    JOIN_ROOM = 'joinRoom',
    LEAVE_ROOM = 'leaveRoom',
    MESSAGE = 'message',
    HEARTBEAT = 'heartbeat',
    SUBSCRIBE = 'subscribe',
    UNSUBSCRIBE = 'unsubscribe',
    SUBSCRIBE_JOB = 'subscribeJob',
    UNSUBSCRIBE_JOB = 'unsubscribeJob',
    SUBSCRIBE_PROVIDER = 'subscribeProvider',
    UNSUBSCRIBE_PROVIDER = 'unsubscribeProvider',

    // Notification Events
    SCOUT_REQUEST_PROCESSING = 'scout.request.processing',
    SCOUT_REQUEST_PROGRESS = 'scout.request.progress',
    SCOUT_REQUEST_COMPLETED = 'scout.request.completed',
    SCOUT_REQUEST_FAILED = 'scout.request.failed',

    // AI Validation Events (emitted within app to forward to clients)
    AI_VALIDATION_CREATED = 'ai.validation.created',
    AI_VALIDATION_STARTED = 'ai.validation.started',
    AI_VALIDATION_PROGRESS = 'ai.validation.progress',
    AI_VALIDATION_COMPLETED = 'ai.validation.completed',
    AI_VALIDATION_FAILED = 'ai.validation.failed',
    AI_VALIDATION_CANCELLED = 'ai.validation.cancelled',
    AI_URL_VALIDATION_UPDATE = 'ai.url.validation.update',

    // Job Events
    JOB_STARTED = 'job.started',
    JOB_PROGRESS = 'job.progress',
    JOB_COMPLETED = 'job.completed',
    JOB_FAILED = 'job.failed',

    // Notification Events
    NOTIFICATION_CREATED = 'notification.created',
    NOTIFICATION_UPDATED = 'notification.updated',
    NOTIFICATION_DELETED = 'notification.deleted',
}
