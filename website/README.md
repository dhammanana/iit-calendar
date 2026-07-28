# IIT Calendar - Landing Page & OTA Update API

This is a Next.js application designed to serve as the landing page and website for the IIT Calendar app. 

Currently, its main function is to host a **self-hosted Capgo OTA (Over-The-Air) update server** that distributes live Javascript bundle updates to the mobile app directly from GitHub releases.

---

## How Capgo OTA Updates Work

The mobile application is built using Capacitor. The `@capgo/capacitor-updater` plugin is configured to query this server's `/api/update` endpoint when the app boots or resumes to check if a new Javascript bundle update is available.

### 1. The Minor-Version Matching Rule

Capgo live updates can modify the web application assets (HTML/CSS/JS) but cannot change the native Android/iOS binary code. Therefore:
- **OTA upgrades are only allowed if the minor version matches the native version.**
- For example, if a device has native build `1.1.1` installed:
  - It **can** download and run OTA bundle `1.1.2`, `1.1.3`, etc.
  - It **cannot** download OTA bundle `1.2.0` or `2.0.0`. Upgrades with a different major or minor version must be distributed and updated via the App Store / Play Store.

### 2. Caching System

To ensure high performance and prevent hitting GitHub API rate limits, the server implements two layers of caching:
1. **GitHub Releases Cache**: The list of releases fetched from the GitHub API is cached in-memory and at the fetch level with a **5-minute TTL**.
2. **ZIP Bundle Caching Proxy**: Instead of serving the GitHub download URL directly to the app (which can run into bandwidth/download throttling), the `/api/update` endpoint returns a proxy URL `/api/download?version=...` pointing back to this server.
   - When requested, the server downloads the bundle once, caches it in-memory and on disk (`/tmp`), and streams it to the client.
   - It also issues long-lived immutable cache control headers so CDNs/devices cache the ZIP forever.

---

## API Endpoints

### 1. Check for Update
- **Endpoint**: `POST /api/update`
- **Request Body**:
  ```json
  {
    "version_build": "1.0.0",
    "version_name": "builtin",
    "custom_id": "stable"
  }
  ```
  - `version_build`: The native binary version installed on the device (e.g. `1.0.0`).
  - `version_name`: The current active OTA bundle version (e.g. `1.0.12`), or `"builtin"` if no update has been installed yet.
  - `custom_id`: *(Optional)* Update channel selected by user (`"stable"` or `"dev"`). Defaults to `"stable"`. When set to `"stable"`, pre-releases or tags containing `-dev` are excluded.
- **Response (Update Available)**:
  ```json
  {
    "version": "1.0.15",
    "url": "https://yourwebsite.com/api/download?version=1.0.15",
    "checksum": "d48a26189d0f088a53714834fbc5211dd634f6190dfc2a7824df6bb19321fa08"
  }
  ```
- **Response (No Update / Up-to-date)**:
  ```json
  {}
  ```

### 2. Download Proxy
- **Endpoint**: `GET /api/download?version=<version>`
- **Response**: Streams the `web-build.zip` bundle for the specified version.

### 3. List Available Versions
- **Endpoint**: `GET /api/versions`
- **Query Parameters (Optional)**:
  - `major`: Filter by major version (e.g. `?major=1`).
  - `minor`: Filter by minor version (e.g. `?minor=0`).
- **Response**:
  ```json
  [
    {
      "version": "1.0.15",
      "name": "Release v1.0.15",
      "tag_name": "v1.0.15",
      "published_at": "2026-06-05T05:54:07Z",
      "download_url": "https://yourwebsite.com/api/download?version=1.0.15"
    }
  ]
  ```

---

## Development & Testing

### Running the Dev Server
From the workspace root directory:
```bash
pnpm --filter website dev -- -p 3002
```

### Running Verification Tests
While the server is running on port `3001` or `3002`, you can execute the pre-written script to verify SemVer logic and proxy caching:
```bash
# From website directory
pnpm exec node test-ota.js
```

---

## Environment Variables

For production, you should define:
- `GITHUB_TOKEN`: A GitHub Personal Access Token. This increases the GitHub API rate limit from 60 requests/hour to 5,000 requests/hour to ensure the API never gets throttled.
