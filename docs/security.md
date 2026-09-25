# Security notes

- Passwords are salted and hashed with PBKDF2-HMAC-SHA256; short-lived access JWTs and rotating refresh JWTs are sent in HttpOnly, SameSite cookies and are not stored in browser local storage. Refresh JTI values are hashed at rest; password-reset tokens are one-time and stored as digests.
- Scan records are scoped to the authenticated owner. Public reports exclude submitted content and can be revoked.
- URLs are parsed but never fetched by the server in this initial build, so there is no server-side redirect or DNS request path.
- User submitted content remains in the local database for history. Users can delete their account and owned scans. Authentication, scan mutation, sharing, and account events are recorded in an audit table. Auth and analysis endpoints use in-process request throttles; use a shared limiter before running multiple API replicas.
- Configure a strong `JWT_SECRET`, restrict CORS, and use TLS before deployment. If development starts without a secret, it generates a random process-local secret and sessions expire when the server restarts. Non-development environments refuse to start without a 32-character secret.
