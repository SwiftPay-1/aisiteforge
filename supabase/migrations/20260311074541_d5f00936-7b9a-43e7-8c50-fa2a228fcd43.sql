
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  bio TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create websites table
CREATE TABLE public.websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  theme TEXT,
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  preview_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id TEXT NOT NULL,
  sender_number TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create daily_usage table
CREATE TABLE public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generation_count INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date)
);
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for websites
CREATE POLICY "Users can view own websites" ON public.websites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own websites" ON public.websites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own websites" ON public.websites FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own websites" ON public.websites FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all websites" ON public.websites FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any website" ON public.websites FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any payment" ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_usage
CREATE POLICY "Users can view own usage" ON public.daily_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own usage" ON public.daily_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own usage" ON public.daily_usage FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
