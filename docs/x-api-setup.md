# X API Setup

BookmarX uses the X API to authenticate and fetch bookmarks from `GET /2/users/{id}/bookmarks`.

## Create An X Developer App

1. Open the X Developer Portal.
2. Create a project and app.
3. Enable OAuth 2.0.
4. Add the callback URL:

```txt
http://localhost:4000/auth/x/callback
```

For a deployed instance, replace the host with your backend URL.

## Required Environment

```env
X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=http://localhost:4000/auth/x/callback
```

## OAuth Scopes

BookmarX currently requests:

```txt
tweet.read users.read bookmark.read offline.access
```

## Pricing Notes

X API v2 uses pay-per-usage pricing. Current X docs list Owned Reads for endpoints including bookmarks at lower cost when the app owner accesses their own data through their own developer app. Prices can change, so verify the X Developer Console before heavy syncs.

BookmarX reduces cost by:

- Syncing manually by default
- Caching fetched bookmarks locally
- Avoiding re-fetching unchanged saved posts where possible
- Tracking resources fetched and estimated sync cost
