'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permission-context';
import { Sidebar } from '@/components/knowledge-base/sidebar';
import { KnowledgeList } from '@/components/knowledge-base/knowledge-list';
import { AIQA } from '@/components/knowledge-base/ai-qa';
import { CategoryManager } from '@/components/knowledge-base/category-manager';
import { TagManager } from '@/components/knowledge-base/tag-manager';
import { Statistics } from '@/components/knowledge-base/statistics';
import PermissionSettings from '@/components/knowledge-base/permission-settings';

type ActiveTab = 'knowledge' | 'qa' | 'categories' | 'tags' | 'statistics' | 'permissions';

const tabLabels: Record<ActiveTab, string> = {
  knowledge: '知识库',
  qa: 'AI 问答',
  categories: '分类管理',
  tags: '标签管理',
  statistics: '数据统计',
  permissions: '权限设置',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('knowledge');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { permissions } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Close mobile menu on tab change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = permissions?.isAdmin ?? false;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="打开菜单"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-slate-800">{tabLabels[activeTab]}</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {activeTab === 'knowledge' && <KnowledgeList />}
          {activeTab === 'qa' && <AIQA />}
          {activeTab === 'categories' && <CategoryManager />}
          {activeTab === 'tags' && <TagManager />}
          {activeTab === 'statistics' && <Statistics />}
          {activeTab === 'permissions' && <PermissionSettings />}
        </main>
      </div>
    </div>
  );
}
