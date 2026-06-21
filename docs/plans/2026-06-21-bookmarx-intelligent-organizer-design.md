# BookmarX Intelligent Organizer Redesign

## Goal

BookmarX should behave as an intelligent X bookmark organizer, not a collection
of manual maintenance tools. Syncing is the primary ingestion action. New or
changed bookmarks are automatically summarized, classified, tagged, assigned
to a stable folder taxonomy, embedded for retrieval, and included in future
briefs.

The interface should be a restrained productivity application built from
shadcn components. It should prioritize reading saved posts, browsing
automatically organized collections, searching, chatting with the archive, and
reading briefs.

## Information Architecture

The authenticated application uses a desktop shadcn sidebar and a mobile
shadcn sheet. The primary navigation is:

- Library
- Search
- Chat
- Briefs
- Folders
- Settings

The sidebar shows the standard folders beneath the primary navigation. Tags
remain visible as metadata and filters, but they are not a separate
administrative destination.

Settings contains account identity, sync and automation state, scheduling
preferences, and logout. Deployment-level AI provider and model configuration
stays in environment configuration and is not editable in the product UI.

## Standard Folder Taxonomy

Every user receives the same stable set of folders:

1. AI & Machine Learning
2. Software Engineering
3. Product & Startups
4. Design & UX
5. Business & Strategy
6. Marketing & Growth
7. Finance & Investing
8. Research & Learning
9. News & Trends
10. Career & Productivity
11. Tools & Resources
12. Writing & Content
13. Health & Lifestyle
14. Culture & Entertainment
15. Inspiration & Ideas
16. Miscellaneous

AI selects exactly one primary folder from this list. It may create or reuse
three to five normalized lowercase tags. It may not create folders outside the
taxonomy.

## Sync-Time Intelligence

For each new or materially changed bookmark, the sync pipeline:

1. Stores the post, author, URLs, media, references, and raw X payload.
2. Enqueues one idempotent enrichment job.
3. Generates a concise summary, content type, primary folder, and tags in one
   structured model response.
4. Upserts the standard folder taxonomy and applies the selected folder.
5. Upserts and applies normalized tags.
6. Rebuilds canonical retrieval text and embeddings after enrichment.

An enrichment failure does not fail the X sync. Jobs retry independently, and
the UI can show processing or failure counts without exposing manual
summarization controls.

Only new or changed posts are enriched. Repeated syncs do not spend AI tokens
on unchanged bookmarks.

## X Post Fidelity

The X API request expands authors, media, referenced posts, and referenced-post
authors. Stored data is sufficient to render:

- profile image, display name, username, and timestamp
- text with original whitespace and line breaks
- mentions, hashtags, cashtags, and resolved links
- photo grids
- video or animated-GIF previews with playable variants when X provides them
- quoted posts rendered as nested post cards
- external link previews
- reply, repost, like, quote, bookmark, and view metrics

The application does not display internal bookmark statuses such as active or
saved. The post body preserves X formatting rather than converting it into a
generic heading.

## Library and Organization

The library is a dense, readable single-column feed with a toolbar for text
search, folder filtering, tag filtering, and sorting. Folder pages are
collections, not CRUD dashboards. Manual folder and tag creation is removed
from the primary experience.

Bookmark detail uses the same post renderer at a larger size and adds the AI
summary, applied folder and tags, source link, and optional private note.

## Chat

Chat is a persistent conversation during the browser session:

- user and assistant messages appear as chat bubbles
- the composer remains anchored beneath the message history
- responses stream
- follow-up questions include recent conversation context
- specific claims cite retrieved bookmarks
- citations open compact source post cards
- empty, loading, abort, weak-context, and error states are explicit

The backend accepts a bounded message history and retrieves sources using the
latest user question. It answers only from retrieved bookmark context.

## Briefs

Briefs are generated automatically when enabled and are presented as editorial
documents rather than raw text blobs. A brief includes:

- a date and concise title
- an executive summary
- grouped themes
- key takeaways
- resurfaced links or posts
- numbered citations to source bookmarks

The backend stores structured JSON alongside a Markdown rendering so the UI can
render predictable sections while retaining backwards compatibility with
existing briefs.

## Component System

Interactive UI uses shadcn components and conventions:

- Sidebar and Sheet
- Button
- Card
- Input and Textarea
- Badge
- Avatar
- Dropdown Menu
- Select
- Tabs
- Separator
- Scroll Area
- Tooltip
- Skeleton
- Alert
- Switch

Application-specific components compose those primitives. Colors, radii,
spacing, typography, focus states, and dark mode are controlled by shared
Tailwind v4 semantic tokens. Native controls with one-off styling are removed.

## Error Handling and Observability

- Sync jobs track fetched, created, updated, enriched, and failed counts.
- Enrichment jobs are idempotent and retry with bounded exponential backoff.
- API input is validated.
- The frontend provides route-level error and loading states.
- Missing media or deleted quoted posts degrade to links without breaking the
  feed.
- Chat and brief generation clearly report unavailable AI configuration.

## Verification

Implementation is complete when:

- frontend and backend typecheck and lint without warnings
- migrations apply on a fresh database
- repeated syncs do not duplicate taxonomy, tags, relations, or AI work
- representative text, URL, image, video, and quote posts render correctly
- desktop sidebar and mobile sheet are keyboard accessible
- chat supports follow-up messages and citations
- briefs render as structured documents
- settings exposes no model controls
- no manual summarize, suggest-tag, folder-assignment, or tag-assignment action
  is required for normal use
