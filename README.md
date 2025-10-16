# Only One Backend

This is the backend API for the Only One System. 

## Overview

This backend is an aggregation of various Google services. It integrates and manages functionalities such as authentication, data storage, and communication using Google APIs, providing a unified RESTful API for client applications.

## Technology Stack

*   **Framework:** [NestJS](https://nestjs.com/)
*   **Language:** TypeScript
*   **ORM:** [TypeORM](https://typeorm.io/)
*   **Database:** PostgreSQL
*   **(Potentially)** Docker for containerization

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd orien-trade-backend
    ```

2.  **Install dependencies:**
    ```bash
    # Using npm
    npm install

    # Or using yarn
    yarn install
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the root directory by copying the example file:
        ```bash
        cp .env.example .env
        ```
    *   Update the `.env` file with your specific configuration, especially database connection details (Host, Port, Username, Password, Database Name).

4.  **Database Setup:**
    *   Ensure you have a running PostgreSQL instance.
    *   (If not using migrations) Set `synchronize: false` in your TypeORM configuration (usually in `ormconfig.ts` or `app.module.ts`) for initial development to automatically create tables. **Note:** This is generally **not recommended** for production.
    *   (Recommended) If using migrations, run the migration command:
        ```bash
        npm run typeorm:migration:run # Adjust command based on your package.json scripts
        ```

## Running the Application

```bash
# Development mode with watch
npm run start:dev

# Or using yarn
yarn start:dev
```

The application should now be running, typically on `http://localhost:3000` (or the port specified in your configuration).


