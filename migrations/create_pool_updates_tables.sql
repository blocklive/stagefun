-- Create pool_updates table
CREATE TABLE public.pool_updates (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  pool_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  CONSTRAINT pool_updates_pkey PRIMARY KEY (id),
  CONSTRAINT pool_updates_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT pool_updates_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_pool_updates_pool_id ON public.pool_updates USING btree (pool_id) TABLESPACE pg_default;
CREATE INDEX idx_pool_updates_creator_id ON public.pool_updates USING btree (creator_id) TABLESPACE pg_default;

-- Create pool_update_likes table for tracking likes
CREATE TABLE public.pool_update_likes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  update_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT pool_update_likes_pkey PRIMARY KEY (id),
  CONSTRAINT pool_update_likes_update_id_fkey FOREIGN KEY (update_id) REFERENCES pool_updates(id) ON DELETE CASCADE,
  CONSTRAINT pool_update_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT pool_update_likes_unique UNIQUE (update_id, user_id)
) TABLESPACE pg_default;

CREATE INDEX idx_pool_update_likes_update_id ON public.pool_update_likes USING btree (update_id) TABLESPACE pg_default;
CREATE INDEX idx_pool_update_likes_user_id ON public.pool_update_likes USING btree (user_id) TABLESPACE pg_default; 