
CREATE TABLE public.developer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'SiteForge Developer',
  bio text DEFAULT 'Full-stack developer passionate about AI and building tools that empower creators.',
  avatar_url text,
  email text DEFAULT '',
  website_url text DEFAULT '',
  github_url text DEFAULT '',
  twitter_url text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.developer_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read developer settings (public landing page)
CREATE POLICY "Anyone can read developer settings" ON public.developer_settings
  FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "Admins can update developer settings" ON public.developer_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert developer settings" ON public.developer_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.developer_settings (name, bio) VALUES ('SiteForge Developer', 'Full-stack developer passionate about AI and building tools that empower creators.');
