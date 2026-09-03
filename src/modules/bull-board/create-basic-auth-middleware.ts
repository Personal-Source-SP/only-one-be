import basicAuth from 'express-basic-auth';

/**
 * Creates a basic authentication middleware for Bull Board
 * @param username Admin username
 * @param password Admin password
 * @returns Express middleware for basic authentication
 */
export function createBasicAuthMiddleware(username: string, password: string): any {
    const users: Record<string, string> = {};
    users[username] = password;

    return basicAuth({
        users,
        challenge: true,
        realm: 'Bull Board',
    });
}
