-- ============================================
-- 2026 项目完整数据库初始化
-- 在 Supabase SQL Editor 中一次性执行
-- ============================================

-- 1. 企业/组织
CREATE TABLE IF NOT EXISTS public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(8) NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS enterprises_invite_code_idx ON public.enterprises(invite_code);
CREATE INDEX IF NOT EXISTS enterprises_owner_id_idx ON public.enterprises(owner_id);

-- 2. 企业成员
CREATE TABLE IF NOT EXISTS public.enterprise_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS enterprise_members_enterprise_id_idx ON public.enterprise_members(enterprise_id);
CREATE INDEX IF NOT EXISTS enterprise_members_user_id_idx ON public.enterprise_members(user_id);

-- 3. 开发者 (平台级)
CREATE TABLE IF NOT EXISTS public.developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. 角色权限定义
CREATE TABLE IF NOT EXISTS public.enterprise_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(enterprise_id, role, permission_key)
);

-- 5. 成员权限覆盖
CREATE TABLE IF NOT EXISTS public.enterprise_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(enterprise_id, user_id, permission_key)
);

-- 6. 话术分类
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES public.enterprises(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS categories_sort_order_idx ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS categories_enterprise_id_idx ON public.categories(enterprise_id);

-- 7. 标签
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES public.enterprises(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#0891b2',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS tags_name_idx ON public.tags(name);
CREATE INDEX IF NOT EXISTS tags_enterprise_id_idx ON public.tags(enterprise_id);

-- 8. 知识库条目
CREATE TABLE IF NOT EXISTS public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES public.enterprises(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  effectiveness_score INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_entries_category_id_idx ON public.knowledge_entries(category_id);
CREATE INDEX IF NOT EXISTS knowledge_entries_is_active_idx ON public.knowledge_entries(is_active);
CREATE INDEX IF NOT EXISTS knowledge_entries_usage_count_idx ON public.knowledge_entries(usage_count);
CREATE INDEX IF NOT EXISTS knowledge_entries_created_at_idx ON public.knowledge_entries(created_at);
CREATE INDEX IF NOT EXISTS knowledge_entries_enterprise_id_idx ON public.knowledge_entries(enterprise_id);

-- 9. 知识库条目标签关联
CREATE TABLE IF NOT EXISTS public.knowledge_entry_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.knowledge_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_entry_tags_entry_id_idx ON public.knowledge_entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS knowledge_entry_tags_tag_id_idx ON public.knowledge_entry_tags(tag_id);

-- 10. 条目版本历史
CREATE TABLE IF NOT EXISTS public.entry_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.knowledge_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS entry_versions_entry_id_idx ON public.entry_versions(entry_id);
CREATE INDEX IF NOT EXISTS entry_versions_version_idx ON public.entry_versions(version);

-- 11. 条目评论
CREATE TABLE IF NOT EXISTS public.entry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.knowledge_entries(id) ON DELETE CASCADE,
  author VARCHAR(50) DEFAULT '匿名用户',
  content TEXT NOT NULL,
  is_merged BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS entry_comments_entry_id_idx ON public.entry_comments(entry_id);
CREATE INDEX IF NOT EXISTS entry_comments_created_at_idx ON public.entry_comments(created_at);

-- 12. 问答历史
CREATE TABLE IF NOT EXISTS public.qa_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES public.enterprises(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  matched_entry_id UUID REFERENCES public.knowledge_entries(id),
  is_ai_generated BOOLEAN DEFAULT false NOT NULL,
  effectiveness_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS qa_history_created_at_idx ON public.qa_history(created_at);
CREATE INDEX IF NOT EXISTS qa_history_matched_entry_id_idx ON public.qa_history(matched_entry_id);
CREATE INDEX IF NOT EXISTS qa_history_is_ai_generated_idx ON public.qa_history(is_ai_generated);
CREATE INDEX IF NOT EXISTS qa_history_enterprise_id_idx ON public.qa_history(enterprise_id);

-- 13. 产品报价主表
CREATE TABLE IF NOT EXISTS public.product_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  specifications TEXT,
  packaging_info TEXT,
  weight TEXT,
  dimensions TEXT,
  box_specs TEXT,
  remarks_text TEXT,
  remarks_images JSONB DEFAULT '[]'::jsonb,
  remarks_attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotations_enterprise ON public.product_quotations(enterprise_id);

-- 14. 价格区间
CREATE TABLE IF NOT EXISTS public.product_price_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.product_quotations(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'CNY',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_ranges_quotation ON public.product_price_ranges(quotation_id);

-- 15. 健康检查 (系统表)
CREATE TABLE IF NOT EXISTS public.health_check (
  id SERIAL NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 完成!
-- ============================================
