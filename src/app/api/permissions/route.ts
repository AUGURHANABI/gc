import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClientOrThrow } from '@/storage/database/supabase-client';
import { getAuthUser, getEnterpriseId, isAdmin, getUserRole, checkPermission } from '@/lib/auth-helpers';

// All available permissions with labels and categories
export const PERMISSION_DEFINITIONS = [
  { key: 'entry:create', label: '新增话术', category: '话术管理' },
  { key: 'entry:edit', label: '编辑话术', category: '话术管理' },
  { key: 'entry:delete', label: '删除话术', category: '话术管理' },
  { key: 'entry:import', label: '导入话术', category: '话术管理' },
  { key: 'category:manage', label: '管理分类', category: '分类与标签' },
  { key: 'tag:manage', label: '管理标签', category: '分类与标签' },
  { key: 'comment:delete', label: '删除评论', category: '评论管理' },
  { key: 'comment:merge', label: '合并评论到答案', category: '评论管理' },
  { key: 'entry:rate', label: '效果评分', category: '其他' },
  { key: 'qa:ask', label: 'AI 问答', category: '其他' },
] as const;

export type PermissionKey = typeof PERMISSION_DEFINITIONS[number]['key'];

// GET /api/permissions - Get permissions for the current enterprise
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const enterpriseId = await getEnterpriseId(req, user.id);
  if (!enterpriseId) {
    return NextResponse.json({ error: '请先加入企业' }, { status: 403 });
  }

  const client = getSupabaseClientOrThrow();
  const userRole = await getUserRole(user.id, enterpriseId);
  const isUserAdmin = userRole === 'owner' || userRole === 'admin';

  // Get all role permissions for this enterprise
  const { data: rolePerms, error } = await client
    .from('enterprise_role_permissions')
    .select('role, permissions')
    .eq('enterprise_id', enterpriseId);

  if (error) {
    return NextResponse.json({ error: '获取权限失败' }, { status: 500 });
  }

  // Build permissions map by role
  const permissionsByRole: Record<string, string[]> = {};
  for (const rp of (rolePerms ?? [])) {
    permissionsByRole[rp.role] = rp.permissions as string[];
  }

  // Ensure member permissions exist (default)
  if (!permissionsByRole['member']) {
    permissionsByRole['member'] = ['entry:create', 'entry:rate', 'qa:ask'];
  }

  // Calculate current user's effective permissions
  let myPermissions: string[];
  if (isUserAdmin) {
    myPermissions = PERMISSION_DEFINITIONS.map(p => p.key);
  } else {
    myPermissions = permissionsByRole['member'] || [];
  }

  return NextResponse.json({
    data: {
      definitions: PERMISSION_DEFINITIONS,
      permissionsByRole,
      myPermissions,
      myRole: userRole,
      isAdmin: isUserAdmin,
    },
  });
}

// PUT /api/permissions - Update permissions for a role (admin only)
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const enterpriseId = await getEnterpriseId(req, user.id);
  if (!enterpriseId) {
    return NextResponse.json({ error: '请先加入企业' }, { status: 403 });
  }

  // Only admins can update permissions
  const isUserAdmin = await isAdmin(user.id, enterpriseId);
  if (!isUserAdmin) {
    return NextResponse.json({ error: '仅管理员可以设置权限' }, { status: 403 });
  }

  const body = await req.json();
  const { role, permissions } = body as { role: string; permissions: string[] };

  if (!role || !Array.isArray(permissions)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  // Only allow setting member permissions via this API (admin/owner always have all)
  if (role !== 'member') {
    return NextResponse.json({ error: '仅可设置普通成员权限' }, { status: 400 });
  }

  // Validate permission keys
  const validKeys: string[] = PERMISSION_DEFINITIONS.map(p => p.key);
  const filteredPermissions = permissions.filter((p: string) => validKeys.includes(p));

  const client = getSupabaseClientOrThrow();

  // Upsert
  const { data, error } = await client
    .from('enterprise_role_permissions')
    .upsert(
      {
        enterprise_id: enterpriseId,
        role: 'member',
        permissions: filteredPermissions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'enterprise_id,role' }
    )
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `更新权限失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data });
}
