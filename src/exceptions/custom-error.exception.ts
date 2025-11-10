export class CustomError<T> extends Error {
    constructor(
        public readonly message: string,
        public readonly data?: T,
    ) {
        const errorMessage = data ? `${message} - Data: ${JSON.stringify(data)}` : message;
        super(errorMessage);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
