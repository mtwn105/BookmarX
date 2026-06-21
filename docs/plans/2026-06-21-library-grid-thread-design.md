# BookmarX Library Grid and Thread Fidelity

## Scope

This revision fixes incomplete post rendering and makes the library useful for
visual browsing and filtering.

## Library

- Use a responsive two-column card grid on desktop and one column on mobile.
- Make the card surface navigate to bookmark detail.
- Keep links, media controls, quoted posts, and external actions independently
  interactive above the card navigation layer.
- Add server-side filters for query, folder, tag, author, content type, media
  presence, posted date, sync date, and newest or oldest ordering.
- Use shadcn controls in a compact filter toolbar.

## Complete Post Text

X long-form posts can provide truncated `text` while exposing complete content
through `note_tweet.text`. Sync requests `note_tweet` and normalizes the post
using the complete text and matching note-tweet entities when available.

X Article links and unresolved link-only posts retain a useful link preview or
explicit external fallback instead of appearing as a meaningless t.co URL.

## Original-Author Threads

For a bookmarked post that belongs to a conversation, BookmarX queries X search
using its `conversation_id` and original author. It paginates results, keeps
only posts authored by that user, and stores them chronologically.

Thread posts are related to the bookmark through a dedicated join table with a
stable position. They are not independently added to the user's bookmark
library.

If the user's X API access does not include the necessary search history,
BookmarX stores whatever connected posts are available from expansions and
renders the bookmarked post normally. Thread lookup failure does not fail sync.

## Media

- Store photo URLs and video preview/variant metadata.
- Use X profile images without rewriting them to invalid size suffixes.
- Render images with stable aspect ratios, object-fit behavior, and a visible
  fallback when the remote resource fails.
- Render video with poster images and highest-bitrate MP4 variants.
- Avoid nesting interactive links, which previously made cards unreliable.

## Cleanup

After implementation and static verification, delete bookmark-derived content:

- bookmarks and bookmark relations
- posts, authors that are no longer referenced, media, and URLs
- chunks and embeddings
- AI jobs
- briefs and events
- sync job history

Preserve:

- users
- X accounts and OAuth tokens
- sessions
- settings
- standard folders
- normalized tags

The next manual sync repopulates the library through the corrected ingestion
pipeline.

## Verification

- Repeated sync remains idempotent.
- Long posts no longer end at approximately 280 characters when note-tweet
  content is present.
- Original-author threads are ordered and rendered as one unit.
- Card navigation works without breaking links or video controls.
- All filters compose correctly.
- Frontend and backend typecheck and lint.
- Frontend production build succeeds.
