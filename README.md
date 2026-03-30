# Tumoro Rating Service

This service provides a robust and flexible system for calculating and managing talent ratings based on various performance metrics. It allows for comprehensive updates to a talent's overall rating, as well as granular updates to individual score components.

## Features

*   **Talent Rating Management:** Retrieve and update talent ratings.
*   **Individual Score Updates:** Update specific scores such as interview, assessment, family tree, profile quality, and spotlight performance.
*   **Event-Driven Integration:** Process activity events from other services to automatically trigger rating updates.
*   **Dynamic K-Factor:** Incorporates a K-factor based on engagement count for nuanced rating adjustments.
*   **Comprehensive Rating History:** Maintains a detailed history of all rating changes and activity events for each talent.
*   **Database Persistence:** Robust PostgreSQL storage for ratings, history, and events.
*   **API Documentation:** Integrated Swagger UI for easy exploration and testing of API endpoints.

## Getting Started

Follow these instructions to set up and run the Tumoro Rating Service locally.

### Prerequisites

Ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Tumoro-Project/tumoro-rating-service.git
    cd tumoro-rating-service
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

Create a `.env` file in the root directory and add the following:

```env
PORT=3002
NODE_ENV=development

# PostgreSQL Connection
DATABASE_URL=your_postgres_connection_string

# Authentication

The service uses two types of authentication:

1.  **Talent/User Authentication:** Uses standard `Bearer <JWT>` tokens. Required for `/v1/talent` and standard rating endpoints.
2.  **Internal Service Authentication:** Used for `/internal` routes and service-to-service updates. It supports two formats:
    *   **Shared Secret:** `Authorization: Service <SERVICE_SECRET>`
    *   **Service JWT:** `Authorization: Bearer <JWT>` (where the payload `type` is `service`).
```

### Running the Service

To start the development server:

```bash
npm run dev
```

The service will be running on `http://localhost:3002` (or the port specified in your `.env`).

## API Documentation

Interactive API documentation is available via Swagger UI once the service is running. Access it at:

[http://localhost:3002/api-docs](http://localhost:3002/api-docs)

This documentation provides detailed information about each endpoint, including parameters, request bodies, and response schemas.

## API Endpoints

Below is a summary of the available API endpoints. For full details and to test them, please refer to the [Swagger UI](#api-documentation).

### 1. Get Talent Rating

Retrieve the current rating and optionally the history for a specific talent.

*   **URL:** `/v1/talent/:talentId/rating`
*   **Method:** `GET`
*   **Parameters:**
    *   `talentId` (path): ID of the talent (string, required).
    *   `includeHistory` (query): Whether to include the talent's rating history (boolean, optional, default: `false`).
*   **Response:** `TalentState` object, optionally with `RatingEntry[]` if `includeHistory` is `true`.

### 2. Update Talent Rating (Comprehensive)

Update a talent's rating by providing a complete set of input scores.

*   **URL:** `/v1/ratings/update/:talentId`
*   **Method:** `POST`
*   **Parameters:**
    *   `talentId` (path): ID of the talent (string, required).
*   **Request Body:** `BaseScoreInput` object (JSON).
    ```json
    {
      "interviewScore": 8,
      "familyTreeScore": 70,
      "assessmentScore": 9,
      "profileQualityScore": 95,
      "spotlightPerformanceScore": 85
    }
    ```
*   **Response:** `TalentState` object.

### 3. Update Individual Scores

Update a specific score component for a talent. Each endpoint expects a `SingleScoreInput` in the request body.

*   **URL:** `/v1/ratings/update/:talentId/{component}-score`
*   **Components:** `interview`, `family-tree`, `assessment`, `profile-quality`, `spotlight-performance`
*   **Method:** `POST`
*   **Request Body:** `SingleScoreInput` object (JSON).
*   **Response:** `TalentState` object.

### 4. Internal Webhooks (Event System)

The Rating Service consumes activity events from other microservices to automatically trigger rating updates. These are essentially "webhooks" that your service calls whenever a relevant talent activity occurs.

*   **Endpoint:** `POST /internal/events`
*   **Authentication:** Requires Internal Service Authentication (see [Authentication](#authentication)).
*   **Payload Schema:**
    ```json
    {
      "talentId": "uuid-string",
      "eventType": "domain.action",
      "sourceService": "your-service-name",
      "payload": {
        "score": 8.5,
        "metadata": { "optional": "context" }
      }
    }
    ```

#### Supported Event Types & Mapping

| Event Type (`eventType`) | Target Rating Component |
| :--- | :--- |
| `interview.completed` | `interviewScore` |
| `assessment.completed` | `assessmentScore` |
| `profile.updated` | `profileQualityScore` |
| `spotlight.posted` | `spotlightPerformanceScore` |
| `family_tree.updated` | `familyTreeScore` |

#### Event Management Endpoints

*   **GET** `/internal/events/:talentId`: Retrieve activity event history for a talent.
*   **GET** `/internal/events/failed`: Retrieve all failed events (Admin only).
*   **POST** `/internal/events/:eventId/retry`: Retry a failed event.

#### Webhook Example (using curl)

```bash
curl -X POST "http://localhost:3002/internal/events" \
     -H "Authorization: Service your_service_secret" \
     -H "Content-Type: application/json" \
     -d '{
           "talentId": "talent123",
           "eventType": "interview.completed",
           "sourceService": "tumoro-interview-service",
           "payload": { "score": 9 }
         }'
```

## Data Models

### `TalentState`

Represents the current state of a talent's rating.

```typescript
interface TalentState {
  talentId: string;
  currentRating: number;
  currentKFactor: number;
  engagementCount: number;
  lastInputScores: BaseScoreInput;
  lastUpdated: Date;
}
```

### `RatingEntry`

Records a historical entry of a talent's rating update.

```typescript
interface RatingEntry {
  entryId: string;
  talentId: string;
  timestamp: Date;
  previousRating: number;
  newRating: number;
  kFactorUsed: number;
  newEngagementCount: number;
  inputScores: BaseScoreInput;
  currentScores: BaseScoreInput;
}
```

### `BaseScoreInput`

Input model for updating score components.

```typescript
interface BaseScoreInput {
  interviewScore?: number;
  familyTreeScore?: number;
  assessmentScore?: number;
  profileQualityScore?: number;
  spotlightPerformanceScore?: number;
}
```

### `SingleScoreInput`

Input model for updating a single score component.

```typescript
interface SingleScoreInput {
  score: number;
}
```

## Rating Calculation Logic

The overall rating is derived from a sum of base scores and adjustments applied via a `kFactor`.

**Initial Setup:**
The default overall rating is **400**. This happens because the default scores are set to:
*   Profile Completion: 100
*   Interview: 100
*   Skill Assessment: 100
*   Spotlight Engagement: 100
*   Family Tree: 0

**Score Conversions:**
When a new score is received, it undergoes specific conversions before being applied:
*   **Interview and Assessment Scores:** These are converted to signed (+/-) adjustments.
    *   For **Interviews (out of 10)**: A score of 3 evaluates to a 0 adjustment. Scores below 3 become negative (down to -30 for a score of 0/10), and scores above 3 become positive (up to +30 for a score of 10/10).
    *   For **Assessments (out of 10)**: Similar logic applies, but the bounds are scaled to -25 to +25 instead of 30.
*   **Other Scores:** Profile Completion (Quality), Family Tree Score, and Spotlight Engagement are used directly and not converted into (+/-) adjustments.

**Final Calculation:**
The base score adjustment is multiplied by the `kFactor` and then added to the previous overall rating to determine the new rating. Finally, this new entry is appended to the user's rating history.

## Quickstart Integration Guide

Here's a quick example of how to integrate with the rating service using `curl`.

### 1. Get a Talent's Initial State (or create if not exists)

```bash
curl -X GET "http://localhost:3002/v1/talent/talent123/rating?includeHistory=true"
```

### 2. Update All Scores for a Talent

```bash
curl -X POST "http://localhost:3002/v1/ratings/update/talent123" \
     -H "Content-Type: application/json" \
     -d '{
           "interviewScore": 7,
           "familyTreeScore": 60,
           "assessmentScore": 8,
           "profileQualityScore": 90,
           "spotlightPerformanceScore": 80
         }'
```

### 3. Update a Single Score (e.g., Interview Score)

```bash
curl -X POST "http://localhost:3002/v1/ratings/update/talent123/interview-score" \
     -H "Content-Type: application/json" \
     -d '{
           "score": 9
         }'
```

## License

This project is licensed under the ISC License. See the `LICENSE` file for details. (Note: A `LICENSE` file is not provided in this example, but it's good practice to include one.)

