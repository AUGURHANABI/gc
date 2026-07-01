'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/lib/permission-context';
import {
  PermissionsData,
  PermissionDefinition,
  updateRolePermissions,
  fetchEnterpriseMembers,
  EnterpriseMember,
  updateMemberRole,
} from '@/lib/api';

const ALL_PERMISSIONS: PermissionDefinition[] = [
  { key: 'entry:create', label: '新增话术', category: '话术管理' },
  { key: 'entry:edit', label: '编辑话术', category: '话术管理' },
  { key: 'entry:delete', label: '删除话术', category: '话术管理' },
  { key: 'entry:import', label: '导入话术', category: '话术管理' },
  { key: 'category:manage', label: '管理分类', category: '分类标签' },
  { key: 'tag:manage', label: '管理标签', category: '分类标签' },
  { key: 'comment:delete', label: '删除评论', category: '评论管理' },
  { key: 'comment:merge', label: '合并评论到答案', category: '评论管理' },
  { key: 'entry:rate', label: '效果评分', category: '其他' },
  { key: 'qa:ask', label: 'AI问答', category: '其他' },
];

const CATEGORIES = [...new Set(ALL_PERMISSIONS.map(p => p.category))];

const ROLE_LABELS: Record<string, string> = {
  owner: '创建者',
  admin: '管理员',
  member: '普通成员',
};

export default function PermissionSettings() {
  const { permissions, refresh } = usePermissions();
  const [memberPerms, setMemberPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'permissions' | 'members'>('permissions');
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Initialize member permissions from fetched data
  useEffect(() => {
    if (permissions?.permissionsByRole?.member) {
      setMemberPerms(permissions.permissionsByRole.member);
    }
  }, [permissions]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const result = await fetchEnterpriseMembers();
      setMembers(result.data);
      setCurrentUserId(result.currentUserId);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members' && permissions?.isAdmin) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, permissions?.isAdmin]);

  const handleTogglePermission = (key: string) => {
    setMemberPerms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await updateRolePermissions('member', memberPerms);
      await refresh();
      alert('权限保存成功');
    } catch (err) {
      alert(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingMemberId(memberId);
    try {
      await updateMemberRole(memberId, newRole);
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      await refresh();
    } catch (err) {
      alert(`更新角色失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (!permissions?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        仅管理员可访问此页面
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'permissions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('permissions')}
        >
          权限设置
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('members')}
        >
          成员管理
        </button>
      </div>

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-base font-semibold mb-1">普通成员权限</h3>
            <p className="text-sm text-muted-foreground mb-4">
              管理员默认拥有所有权限。以下设置仅对普通成员生效。
            </p>

            {CATEGORIES.map(category => (
              <div key={category} className="mb-5 last:mb-0">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter(p => p.category === category).map(perm => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={memberPerms.includes(perm.key)}
                        onChange={() => handleTogglePermission(perm.key)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存权限设置'}
          </button>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold">成员列表</h3>
          </div>
          {loadingMembers ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无成员</div>
          ) : (
            <div className="divide-y divide-border">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {member.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {member.user_id.slice(0, 8)}...
                        {member.user_id === currentUserId && (
                          <span className="ml-2 text-xs text-muted-foreground">(你)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        加入于 {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                        创建者
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={updatingMemberId === member.id}
                        className="text-sm rounded-md border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="admin">管理员</option>
                        <option value="member">普通成员</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
