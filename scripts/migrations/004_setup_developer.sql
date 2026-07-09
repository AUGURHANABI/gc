-- 把最早注册的用户设为开发者
-- 在 Supabase SQL Editor 中执行

INSERT INTO public.developers (user_id)
SELECT id FROM auth.users ORDER BY created_at LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
