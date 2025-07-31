# Only One Backend

Backend API service for the Only One Competitor Price Monitoring System.

## Overview

This project provides the backend infrastructure for monitoring competitor product prices. It manages product and data provider configurations, orchestrates data scraping tasks (manually triggered in the MVP), stores the collected pricing data, and exposes a RESTful API for the frontend dashboard and potentially other clients.

## Core Features (MVP)

*   **Product Management:** CRUD operations for monitored products.
*   **Data Provider Management:** CRUD operations for competitor websites (Data Providers), including country, currency, and designated scraping service (`provider_service`).
*   **Target Configuration:** Define specific product targets (`DataProviderProduct`) on each data provider, including necessary configuration (`target_config`) for scraping.
*   **Manual Scraping Trigger:** API endpoint to initiate price scraping for selected targets on demand.
*   **Price Data Storage:** Persists scraped price information, status, metadata, and raw HTML in a PostgreSQL database.
*   **API for Frontend:** Exposes endpoints for the dashboard to display configurations and latest pricing data.

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
    *   (If not using migrations) Set `synchronize: true` in your TypeORM configuration (usually in `ormconfig.ts` or `app.module.ts`) for initial development to automatically create tables. **Note:** This is generally **not recommended** for production.
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

## API

(TODO: Add link to API documentation or briefly list main endpoints)

## Contributing

(TODO: Add guidelines for contributing if applicable)
