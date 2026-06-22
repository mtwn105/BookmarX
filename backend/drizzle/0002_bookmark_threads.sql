CREATE TABLE bookmark_thread_posts (
  bookmark_id uuid NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bookmark_id, post_id)
);

CREATE INDEX bookmark_thread_posts_bookmark_position_idx
  ON bookmark_thread_posts (bookmark_id, position);

ALTER TABLE post_urls ADD COLUMN image_url text;
