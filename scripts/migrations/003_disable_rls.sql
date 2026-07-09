-- 关掉所有业务表的 RLS
-- 应用已通过 service_role key 做权限控制，不需要 RLS

ALTER TABLE public.enterprises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_member_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entry_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_ranges DISABLE ROW LEVEL SECURITY;
