-- 产品报价表 + 价格区间表
-- 在 Supabase SQL Editor 中执行此文件

-- 产品报价主表
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

-- 价格区间关联表
CREATE TABLE IF NOT EXISTS public.product_price_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.product_quotations(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'CNY',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_quotations_enterprise ON public.product_quotations(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_price_ranges_quotation ON public.product_price_ranges(quotation_id);
