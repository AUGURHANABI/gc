-- ============================================
-- Supabase RLS 策略：允许认证用户操作
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 启用所有表的 RLS
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entry_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_ranges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- enterprises: 认证用户可创建/查看/更新/删除
-- ============================================
CREATE POLICY "允许认证用户创建企业" ON public.enterprises
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "允许认证用户查看自己的企业" ON public.enterprises
  FOR SELECT TO authenticated USING (
    id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "允许企业主更新企业" ON public.enterprises
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "允许企业主删除企业" ON public.enterprises
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============================================
-- enterprise_members: 认证用户可加入/查看
-- ============================================
CREATE POLICY "允许认证用户加入企业" ON public.enterprise_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "允许查看同企业成员" ON public.enterprise_members
  FOR SELECT TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

CREATE POLICY "允许企业主管理成员" ON public.enterprise_members
  FOR DELETE TO authenticated USING (
    enterprise_id IN (SELECT id FROM public.enterprises WHERE owner_id = auth.uid())
  );

-- ============================================
-- developers: 开发者自己可读写
-- ============================================
CREATE POLICY "允许认证用户成为开发者" ON public.developers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "允许认证用户查看开发者" ON public.developers
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- 权限表: 企业主可管理
-- ============================================
CREATE POLICY "企业主管理角色权限" ON public.enterprise_role_permissions
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT id FROM public.enterprises WHERE owner_id = auth.uid())
  );

CREATE POLICY "企业主管理成员权限" ON public.enterprise_member_permissions
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT id FROM public.enterprises WHERE owner_id = auth.uid())
  );

-- ============================================
-- 业务数据表: 同企业成员可读写
-- ============================================

-- categories
CREATE POLICY "同企业成员可读写分类" ON public.categories
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

-- tags
CREATE POLICY "同企业成员可读写标签" ON public.tags
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

-- knowledge_entries
CREATE POLICY "同企业成员可读写知识库" ON public.knowledge_entries
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

-- knowledge_entry_tags
CREATE POLICY "同企业成员可读写标签关联" ON public.knowledge_entry_tags
  FOR ALL TO authenticated USING (
    entry_id IN (SELECT id FROM public.knowledge_entries WHERE enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid()))
  );

-- entry_versions
CREATE POLICY "同企业成员可读写版本历史" ON public.entry_versions
  FOR ALL TO authenticated USING (
    entry_id IN (SELECT id FROM public.knowledge_entries WHERE enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid()))
  );

-- entry_comments
CREATE POLICY "同企业成员可读写评论" ON public.entry_comments
  FOR ALL TO authenticated USING (
    entry_id IN (SELECT id FROM public.knowledge_entries WHERE enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid()))
  );

-- qa_history
CREATE POLICY "同企业成员可读写问答历史" ON public.qa_history
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

-- product_quotations
CREATE POLICY "同企业成员可读写报价" ON public.product_quotations
  FOR ALL TO authenticated USING (
    enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid())
  );

-- product_price_ranges
CREATE POLICY "同企业成员可读写价格区间" ON public.product_price_ranges
  FOR ALL TO authenticated USING (
    quotation_id IN (SELECT id FROM public.product_quotations WHERE enterprise_id IN (SELECT enterprise_id FROM public.enterprise_members WHERE user_id = auth.uid()))
  );

-- ============================================
-- health_check: 公开可读
-- ============================================
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开可读健康检查" ON public.health_check
  FOR SELECT USING (true);

-- ============================================
-- 完成!
-- ============================================
