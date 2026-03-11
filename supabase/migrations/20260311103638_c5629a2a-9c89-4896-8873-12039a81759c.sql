
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans" ON public.subscription_plans
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add plan_id and plan_expires_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);

-- Add plan_id to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);

-- Insert default plans
INSERT INTO public.subscription_plans (name, duration_days, price, features, sort_order) VALUES
  ('3 Days Trial', 3, 99, ARRAY['AI Website Generation', 'Basic Themes', '5 Websites'], 1),
  ('7 Days Starter', 7, 199, ARRAY['AI Website Generation', 'All Themes', '15 Websites', 'AI Editing'], 2),
  ('15 Days Pro', 15, 349, ARRAY['Unlimited AI Generations', 'All Themes', 'Unlimited Websites', 'AI Editing', 'Priority Support'], 3),
  ('30 Days Premium', 30, 499, ARRAY['Unlimited AI Generations', 'All Themes', 'Unlimited Websites', 'AI Editing', 'Priority Support', 'Custom Domain'], 4);
