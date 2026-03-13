
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hosted-websites', 'hosted-websites', true, 5242880, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload websites"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hosted-websites');

CREATE POLICY "Public read access for hosted websites"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'hosted-websites');

CREATE POLICY "Users can update own websites"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hosted-websites');

ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS deployed_url text;
