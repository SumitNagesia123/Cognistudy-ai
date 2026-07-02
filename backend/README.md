# CogniStudy AI — Backend API Reference

This document outlines the API endpoints, authentication requirements, query parameters, and request/response models for the CogniStudy AI backend.

---

## 🔑 Authentication
All endpoints (except health and registration/login) require authentication. 
Pass the JWT token in the `Authorization` header as a Bearer token:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 🚀 Health Check
### `GET /`
Returns the status of the server.
*   **Auth Required**: No
*   **Response**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-06-21T10:45:00.000Z"
    }
    ```

---

## 👥 Authentication Endpoints

### `POST /auth/register`
Create a new user account and receive a token.
*   **Auth Required**: No (Rate limited: 10 attempts per 15 minutes)
*   **Request Body**:
    *   `name` (String, required)
    *   `email` (String, required, must be valid format)
    *   `password` (String, required, min 8 characters)
*   **Response (201 Created)**:
    ```json
    {
      "token": "eyJhbG...",
      "user": {
        "id": "60d...",
        "name": "Alex Smith",
        "email": "alex@example.com",
        "preferences": {}
      }
    }
    ```

### `POST /auth/login`
Sign in with existing credentials.
*   **Auth Required**: No (Rate limited: 10 attempts per 15 minutes)
*   **Request Body**:
    *   `email` (String, required)
    *   `password` (String, required)
*   **Response (200 OK)**:
    ```json
    {
      "token": "eyJhbG...",
      "user": {
        "id": "60d...",
        "name": "Alex Smith",
        "email": "alex@example.com",
        "preferences": {}
      }
    }
    ```

### `GET /auth/me`
Retrieve the authenticated user's profile.
*   **Auth Required**: Yes
*   **Response (200 OK)**:
    ```json
    {
      "_id": "60d...",
      "name": "Alex Smith",
      "email": "alex@example.com",
      "preferences": {},
      "createdAt": "2026-06-21T10:45:00.000Z"
    }
    ```

### `PUT /auth/preferences`
Update user dashboard / study environment preferences.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `preferences` (Object, required) e.g. `{ "darkMode": true }`
*   **Response (200 OK)**:
    ```json
    {
      "preferences": {
        "darkMode": true
      }
    }
    ```

---

## 📚 Study Plans Endpoints

### `POST /study-plans`
Create a new study plan.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `subject` (String, required) — e.g. "Chemistry"
    *   `startTime` (Date/ISO-8601, required)
    *   `endTime` (Date/ISO-8601, required, must be after `startTime`)
    *   `type` (String, optional) — Enum: `['reading', 'test', 'review']`. Defaults to `'reading'`.
    *   `sessionId` (ObjectId string, optional) — links to a PDF session.
*   **Response (201 Created)**:
    ```json
    {
      "_id": "667...",
      "userId": "60d...",
      "subject": "Chemistry",
      "type": "reading",
      "startTime": "2026-06-22T09:00:00.000Z",
      "endTime": "2026-06-22T10:30:00.000Z",
      "status": "upcoming",
      "sessionId": null,
      "createdAt": "2026-06-21T10:45:00.000Z"
    }
    ```

### `GET /study-plans`
List study plans for the authenticated user, sorted by `startTime` ascending.
*   **Auth Required**: Yes
*   **Query Parameters**:
    *   `date` (String, optional) — Format: `YYYY-MM-DD`. Filters plans starting within that UTC calendar day.
*   **Response (200 OK)**:
    ```json
    [
      {
        "_id": "667...",
        "userId": "60d...",
        "subject": "Chemistry",
        "type": "reading",
        "startTime": "2026-06-22T09:00:00.000Z",
        "endTime": "2026-06-22T10:30:00.000Z",
        "status": "upcoming",
        "sessionId": null,
        "createdAt": "2026-06-21T10:45:00.000Z"
      }
    ]
    ```

### `GET /study-plans/deadlines`
Fetch urgent plans and missed deadlines.
*   **Auth Required**: Yes
*   **Response (200 OK)**:
    *   `urgent`: Array of plans starting within the next 24 hours with `status: 'upcoming'`.
    *   `missed`: Array of plans where `endTime` has passed but `status` remains `'upcoming'`.
    ```json
    {
      "urgent": [
        {
          "_id": "667...",
          "subject": "Chemistry",
          "startTime": "2026-06-22T09:00:00.000Z",
          "endTime": "2026-06-22T10:30:00.000Z",
          "status": "upcoming"
        }
      ],
      "missed": []
    }
    ```

### `PUT /study-plans/:id`
Modify details of an existing study plan.
*   **Auth Required**: Yes
*   **Request Body** (all fields optional):
    *   `subject` (String)
    *   `type` (String, Enum: `['reading', 'test', 'review']`)
    *   `startTime` (Date/ISO-8601)
    *   `endTime` (Date/ISO-8601)
    *   `status` (String, Enum: `['upcoming', 'completed', 'missed']`)
    *   `sessionId` (ObjectId String)
*   **Response (200 OK)**:
    ```json
    {
      "_id": "667...",
      "subject": "Chemistry Prep",
      "type": "test",
      "startTime": "2026-06-22T09:00:00.000Z",
      "endTime": "2026-06-22T11:00:00.000Z",
      "status": "upcoming"
    }
    ```

### `PATCH /study-plans/:id/status`
Update status directly.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `status` (String, required) — Enum: `['upcoming', 'completed', 'missed']`
*   **Response (200 OK)**:
    ```json
    {
      "_id": "667...",
      "status": "completed"
    }
    ```

### `DELETE /study-plans/:id`
Remove a study plan.
*   **Auth Required**: Yes
*   **Response (200 OK)**:
    ```json
    {
      "result": "Study plan deleted successfully."
    }
    ```

---

## 📂 Document Summary & AI Endpoints

### `POST /summary`
Summarize plain text notes and store them as a new session.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `text` (String, required)
*   **Response (200 OK)**:
    ```json
    {
      "result": "Summarized content here...",
      "_id": "60d..."
    }
    ```

### `POST /improve`
Polish and format text notes using Markdown syntax.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `text` (String, required)
*   **Response (200 OK)**:
    ```json
    {
      "result": "# Polished Title\n..."
    }
    ```

### `POST /upload-pdf`
Upload a PDF document to start an interactive chat session.
*   **Auth Required**: Yes (using `multipart/form-data`)
*   **Request Body**:
    *   `file` (Binary File, required, max 10MB)
*   **Response (200 OK)**:
    ```json
    {
      "result": "PDF uploaded",
      "summary": "AI summary of the PDF...",
      "_id": "60d...",
      "session": { ... }
    }
    ```

### `POST /ask-pdf`
Chat with the uploaded PDF.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `question` (String, required)
    *   `sessionId` (ObjectId String, optional)
*   **Response (200 OK)**:
    ```json
    {
      "result": "Answer to your question..."
    }
    ```

### `POST /flashcards`
Generate 5 study flashcards from a PDF session.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `sessionId` (ObjectId String, optional)
*   **Response (200 OK)**:
    ```json
    {
      "cards": [
        { "question": "Q1?", "answer": "A1" }
      ]
    }
    ```

---

## 📜 History & Notes CRUD

### `GET /history`
Retrieve full notes and summary history.
*   **Auth Required**: Yes
*   **Response (200 OK)**:
    ```json
    [
      {
        "_id": "60d...",
        "type": "summary",
        "input": "My chemistry notes...",
        "output": "Summary of chemistry notes...",
        "createdAt": "2026-06-21T10:00:00.000Z"
      }
    ]
    ```

### `PUT /history/:id`
Edit study note/history item directly.
*   **Auth Required**: Yes
*   **Request Body**:
    *   `input` (String, required)
    *   `output` (String, required)
*   **Response (200 OK)**:
    ```json
    {
      "_id": "60d...",
      "input": "Updated notes...",
      "output": "Updated summary..."
    }
    ```

### `DELETE /delete/:id`
Remove an item from history and clean up any linked PDF session.
*   **Auth Required**: Yes
*   **Response (200 OK)**:
    ```json
    {
      "result": "Deleted successfully."
    }
    ```
