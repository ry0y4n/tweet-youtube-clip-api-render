# API Server for PYTV Chrome Extension

## Description

This API server is specifically designed to serve the "PYTV" Chrome extension. It provides authentication and video posting functionalities to the client. The client repository for "PYTV" is publicly available. Below are detailed explanations for the API endpoints and their roles.

## Important Note

- Authentication credentials for this repository are concealed with `.gitignore`. Thus, third parties cannot operate this repository simply by cloning it.
- While the server's source code is publicly available, it does not contain any authentication or security-related information. Please be cautious of this fact. The exposed source code is primarily intended for educational or reference purposes.

## Workflow

1. The client initiates by clicking on the PYTV extension, triggering `index.html`.
2. `index.html` checks chrome.storage to determine the existence of authentication credentials.
3. If the "Post Video" button is clicked:
   - If there are no authentication credentials, it proceeds to step [4].
   - If credentials exist, it sends a request to the `/post` endpoint with the credentials as a query.
   - The API server establishes a client at the `/post` endpoint using the provided credentials and posts the video.
4. `index.html` sends a request to the `/auth` endpoint, retrieving an authentication page URL and `oauth_token_secret`.
5. The client saves `oauth_token_secret` to chrome.storage and opens the authentication page URL in a new tab.
6. Upon authorizing on the authentication page, the user is redirected to `auth_callback.html`.
7. `auth_callback.html` retrieves `oauth_token` and `oauth_verifier` from the query and saves them to chrome.storage.
8. `auth_callback.html` sends a request to the `/login` endpoint with a query containing `oauth_token`, `oauth_verifier`, and `oauth_token_secret`.
9. The API server logs in via the `/login` endpoint using the provided OAuth information, then generates and returns `accessToken` and `accessSecret`.
10. `auth_callback.html` receives and saves the `accessToken` and `accessSecret` to chrome.storage.

## Endpoints

- `/post`: Endpoint for posting videos. Requires authentication credentials.
- `/auth`: Returns an authentication page URL and `oauth_token_secret`.
- `/login`: Logs in using the provided OAuth information and returns `accessToken` and `accessSecret`.

## Client Repository and Webstore Link

- **Client Repository**: [PYTV on GitHub](https://github.com/ry0y4n/PYTV)
- **Chrome Webstore**: [PYTV - Post YouTube Video](https://chrome.google.com/webstore/detail/pytv-post-youtube-video/hneopkclkanekbplnkfkfmkiaghfoneb)
