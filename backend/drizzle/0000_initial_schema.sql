CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE sync_job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE ai_job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE bookmark_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE content_type AS ENUM ('post', 'thread', 'link', 'media', 'idea', 'code', 'research', 'news', 'unknown');
CREATE TYPE ai_provider AS ENUM ('vercel', 'openai', 'xai', 'ollama', 'custom');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (email);

CREATE TABLE x_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_user_id text NOT NULL,
  username text NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX x_accounts_x_user_id_unique_idx ON x_accounts (x_user_id);
CREATE INDEX x_accounts_user_id_idx ON x_accounts (user_id);

CREATE TABLE oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_account_id uuid NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX oauth_tokens_x_account_id_unique_idx ON oauth_tokens (x_account_id);

CREATE TABLE post_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_user_id text NOT NULL,
  username text NOT NULL,
  display_name text,
  avatar_url text,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX post_authors_x_user_id_unique_idx ON post_authors (x_user_id);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_post_id text NOT NULL,
  author_id uuid REFERENCES post_authors(id) ON DELETE SET NULL,
  conversation_id text,
  text text NOT NULL,
  language text,
  content_type content_type NOT NULL DEFAULT 'unknown',
  reply_count integer,
  repost_count integer,
  like_count integer,
  quote_count integer,
  bookmark_count integer,
  impression_count integer,
  posted_at timestamptz,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX posts_x_post_id_unique_idx ON posts (x_post_id);
CREATE INDEX posts_author_id_idx ON posts (author_id);
CREATE INDEX posts_posted_at_idx ON posts (posted_at);

CREATE TABLE post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_key text NOT NULL,
  type text NOT NULL,
  url text,
  preview_image_url text,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX post_media_post_id_media_key_unique_idx ON post_media (post_id, media_key);

CREATE TABLE post_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  expanded_url text,
  display_url text,
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX post_urls_post_id_idx ON post_urls (post_id);

CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX folders_user_id_parent_id_name_unique_idx ON folders (user_id, parent_id, name);
CREATE INDEX folders_user_id_idx ON folders (user_id);

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tags_user_id_name_unique_idx ON tags (user_id, name);

CREATE TABLE bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  x_post_id text NOT NULL,
  status bookmark_status NOT NULL DEFAULT 'active',
  note text,
  ai_summary text,
  ai_content_type content_type NOT NULL DEFAULT 'unknown',
  read_at timestamptz,
  archived_at timestamptz,
  x_bookmarked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bookmarks_user_id_x_post_id_unique_idx ON bookmarks (user_id, x_post_id);
CREATE INDEX bookmarks_user_id_idx ON bookmarks (user_id);
CREATE INDEX bookmarks_post_id_idx ON bookmarks (post_id);
CREATE INDEX bookmarks_status_idx ON bookmarks (status);
CREATE INDEX bookmarks_x_bookmarked_at_idx ON bookmarks (x_bookmarked_at);

CREATE TABLE bookmark_folders (
  bookmark_id uuid NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bookmark_id, folder_id)
);

CREATE TABLE bookmark_tags (
  bookmark_id uuid NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bookmark_id, tag_id)
);

CREATE TABLE bookmark_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id uuid NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  content text NOT NULL,
  token_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bookmark_chunks_bookmark_id_idx ON bookmark_chunks (bookmark_id);

CREATE TABLE bookmark_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES bookmark_chunks(id) ON DELETE CASCADE,
  model text NOT NULL,
  dimensions integer NOT NULL DEFAULT 1536,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bookmark_embeddings_chunk_id_model_unique_idx ON bookmark_embeddings (chunk_id, model);
CREATE INDEX bookmark_embeddings_embedding_idx ON bookmark_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status sync_job_status NOT NULL DEFAULT 'queued',
  cursor text,
  resources_fetched integer NOT NULL DEFAULT 0,
  estimated_cost_micros integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sync_jobs_user_id_created_at_idx ON sync_jobs (user_id, created_at);

CREATE TABLE ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmark_id uuid REFERENCES bookmarks(id) ON DELETE CASCADE,
  type text NOT NULL,
  status ai_job_status NOT NULL DEFAULT 'queued',
  model text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_jobs_user_id_created_at_idx ON ai_jobs (user_id, created_at);

CREATE TABLE briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  generated_for timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX briefs_user_id_generated_for_idx ON briefs (user_id, generated_for);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmark_id uuid REFERENCES bookmarks(id) ON DELETE SET NULL,
  type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_user_id_created_at_idx ON events (user_id, created_at);

CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_provider ai_provider NOT NULL DEFAULT 'vercel',
  embedding_model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  chat_model text NOT NULL DEFAULT 'openai/gpt-4o-mini',
  scheduled_sync_enabled boolean NOT NULL DEFAULT false,
  daily_brief_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX settings_user_id_unique_idx ON settings (user_id);
