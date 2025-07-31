import * as path from 'path';

export const DB_CONNECTION = {
    PG: 'postgresConnection',
};

export const DEFAULT_PAGE_SIZE = 10;

export const USER_ID = 'USER_ID';

export const USER_CLAIMS = 'USER_CLAIMS';

export const CACHE_KEY = {};

export const LIMIT_IMAGE_SIZE = 5 * 1000 * 1000;
export const ACCEPT_IMAGE_TYPE = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/jpg'];

export const EMAIL_TEMPLATE_PATH = path.join(__dirname, '..', 'shared/templates/email');
export const MJML_EMAIL_TEMPLATE_PATH = path.join(__dirname, '..', 'shared/templates/mjml');

export const PERMISSION_ACTION = {
    LIST: 'list',
    EDIT: 'edit',
    CREATE: 'create',
    DELETE: 'delete',
    SHOW: 'show',
};

const { LIST, EDIT, DELETE, CREATE, SHOW } = PERMISSION_ACTION;
