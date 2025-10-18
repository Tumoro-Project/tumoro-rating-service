# Tumoro Rating Service

This service provides a robust and flexible system for calculating and managing talent ratings based on various performance metrics. It allows for comprehensive updates to a talent's overall rating, as well as granular updates to individual score components.

## Features

*   **Talent Rating Management:** Retrieve and update talent ratings.
*   **Individual Score Updates:** Update specific scores such as interview, assessment, family tree, profile quality, and spotlight performance.
*   **Dynamic K-Factor:** Incorporates a K-factor based on engagement count for nuanced rating adjustments.
*   **Comprehensive Rating History:** Maintains a detailed history of all rating changes for each talent.
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

### Running the Service

To start the development server:

```bash
npm run dev
```

The service will be running on `http://localhost:3000`.

## API Documentation

Interactive API documentation is available via Swagger UI once the service is running. Access it at:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

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

*   **URL:** `/v1/ratings/update/:talentId/interview-score`
*   **URL:** `/v1/ratings/update/:talentId/family-tree-score`
*   **URL:** `/v1/ratings/update/:talentId/assessment-score`
*   **URL:** `/v1/ratings/update/:talentId/profile-quality-score`
*   **URL:** `/v1/ratings/update/:talentId/spotlight-performance-score`
*   **Method:** `POST`
*   **Parameters:**
    *   `talentId` (path): ID of the talent (string, required).
*   **Request Body:** `SingleScoreInput` object (JSON).
    ```json
    {
      "score": 75
    }
    ```
*   **Response:** `TalentState` object.

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
  baseScore: number; // Aggregated score before kFactor application to individual components
  kFactorUsed: number;
  newEngagementCount: number;
  inputScores: BaseScoreInput;
}
```

### `BaseScoreInput`

Input model for updating all score components simultaneously.

```typescript
interface BaseScoreInput {
  interviewScore: number;
  familyTreeScore: number;
  assessmentScore: number;
  profileQualityScore: number;
  spotlightPerformanceScore: number;
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

The overall rating is derived from a sum of `profileQualityScore`, `interviewScore`, `assessmentScore`, `familyTreeScore`, and `spotlightPerformanceScore`. The `interviewScore` and `assessmentScore` are first converted to a signed value (e.g., -30 to +30 for interview, -25 to +25 for assessment) based on specific rules outlined in the `src/utilities/rating.helpers.ts` file. The `profileQualityScore`, `familyTreeScore`, and `spotlightPerformanceScore` are used directly. A `kFactor` is then applied to the aggregated base score to determine the final rating adjustment.

## Quickstart Integration Guide

Here's a quick example of how to integrate with the rating service using `curl`.

### 1. Get a Talent's Initial State (or create if not exists)

```bash
curl -X GET "http://localhost:3000/v1/talent/talent123/rating?includeHistory=true"
```

### 2. Update All Scores for a Talent

```bash
curl -X POST "http://localhost:3000/v1/ratings/update/talent123" \
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
curl -X POST "http://localhost:3000/v1/ratings/update/talent123/interview-score" \
     -H "Content-Type: application/json" \
     -d '{
           "score": 9
         }'
```

## License

This project is licensed under the ISC License. See the `LICENSE` file for details. (Note: A `LICENSE` file is not provided in this example, but it's good practice to include one.)

