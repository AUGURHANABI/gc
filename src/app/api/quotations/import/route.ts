import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthUser,
  getEnterpriseId,
  checkPermission,
  forbiddenResponse,
  checkLicenseExpired,
} from '@/lib/auth-helpers';
import { getSupabaseClientOrThrow } from '@/storage/database/supabase-client';

// 解析 CSV 行，正确处理引号内的逗号
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 双引号转义
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// POST: 导入报价数据
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const enterpriseId = await getEnterpriseId(req, user.id);
  if (!enterpriseId) {
    return NextResponse.json({ error: '未找到企业' }, { status: 400 });
  }

  // 检查许可证
  const licenseErr = await checkLicenseExpired(enterpriseId);
  if (licenseErr) return licenseErr;

  // 检查权限
  const hasPermission = await checkPermission(user.id, enterpriseId, 'quotation:import');
  if (!hasPermission) {
    return forbiddenResponse('quotation:import');
  }

  const client = getSupabaseClientOrThrow();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }

    // 读取文件内容
    const text = await file.text();
    // 处理可能的 BOM 和换行符
    const cleanText = text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: '文件内容不足，至少需要标题行和一行数据' }, { status: 400 });
    }

    // 解析数据行（跳过标题行）
    const imported: Array<{ product_code: string; product_name: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      try {
        // 提取基本字段（按模板列顺序）
        // 列索引: 0=货号, 1=名称, 2=规格, 3=包装, 4=重量, 5=尺寸, 6=箱规, 7=备注
        // 8-11=区间1, 12-15=区间2, 16-19=区间3
        const product_code = values[0] || '';
        const product_name = values[1] || '';

        if (!product_code || !product_name) {
          errors.push({ row: i + 1, error: '产品货号和产品名称为必填项' });
          continue;
        }

        // 提取价格区间
        const priceRanges: Array<{ min_quantity: number; max_quantity: number | null; price: number; unit: string }> = [];
        
        // 区间1: 索引 8, 9, 10, 11
        const minQty1 = parseInt(values[8]) || 1;
        const maxQty1 = values[9] ? parseInt(values[9]) : null;
        const price1 = parseFloat(values[10]) || 0;
        const unit1 = values[11] || 'CNY';
        if (price1 > 0) {
          priceRanges.push({ min_quantity: minQty1, max_quantity: maxQty1, price: price1, unit: unit1 });
        }

        // 区间2: 索引 12, 13, 14, 15
        const minQty2 = parseInt(values[12]) || 0;
        const maxQty2 = values[13] ? parseInt(values[13]) : null;
        const price2 = parseFloat(values[14]) || 0;
        const unit2 = values[15] || 'CNY';
        if (minQty2 > 0 && price2 > 0) {
          priceRanges.push({ min_quantity: minQty2, max_quantity: maxQty2, price: price2, unit: unit2 });
        }

        // 区间3: 索引 16, 17, 18, 19
        const minQty3 = parseInt(values[16]) || 0;
        const maxQty3 = values[17] ? parseInt(values[17]) : null;
        const price3 = parseFloat(values[18]) || 0;
        const unit3 = values[19] || 'CNY';
        if (minQty3 > 0 && price3 > 0) {
          priceRanges.push({ min_quantity: minQty3, max_quantity: maxQty3, price: price3, unit: unit3 });
        }

        // 创建报价
        const { data: quotation, error: qError } = await client
          .from('product_quotations')
          .insert({
            enterprise_id: enterpriseId,
            product_code,
            product_name,
            specifications: values[2] || null,
            packaging_info: values[3] || null,
            weight: values[4] ? parseFloat(values[4]) : null,
            dimensions: values[5] || null,
            box_specs: values[6] || null,
            remarks_text: values[7] || null,
            remarks_images: [],
            remarks_attachments: [],
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (qError || !quotation) {
          errors.push({ row: i + 1, error: `创建报价失败: ${qError?.message || '未知错误'}` });
          continue;
        }

        // 创建价格区间
        if (priceRanges.length > 0) {
          const { error: prError } = await client.from('product_price_ranges').insert(
            priceRanges.map(pr => ({
              quotation_id: quotation.id,
              ...pr,
            }))
          );
          if (prError) {
            console.error('Price range insert error:', prError);
          }
        }

        imported.push({ product_code, product_name });
      } catch (e) {
        errors.push({ row: i + 1, error: `解析失败: ${String(e)}` });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // 只返回前10个错误
      imported: imported.slice(0, 5), // 返回前5条成功导入的记录供参考
    });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: '导入处理失败' }, { status: 500 });
  }
}