export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    RUN_JOB = 'RUN_JOB',
    CHANGE_CONFIG = 'CHANGE_CONFIG',
    IMPORT = 'IMPORT',
    EXPORT = 'EXPORT',
    TRIGGER_MANUAL = 'TRIGGER_MANUAL',
}

export enum AuditStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum AuditResource {
    USER = 'USER',
    DATA_PROVIDER = 'DATA_PROVIDER',
    DATA_PROVIDER_FEATURE = 'DATA_PROVIDER_FEATURE',
    SETTING = 'SETTING',
    CRAWLER_JOB = 'CRAWLER_JOB',
    DISCOVERY_URL = 'DISCOVERY_URL',
    AUTH_SESSION = 'AUTH_SESSION',
    SYSTEM = 'SYSTEM',
}

export const AUDIT_LOG_EVENTS = {
    RECORD: 'audit.log.record',
};
