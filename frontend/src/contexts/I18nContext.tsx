import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setDateLocale } from '../utils/dateUtils';

export type Language = 'zh' | 'en' | 'ja';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    'app.title': 'My Gantt - 项目甘特图',
    'project.select': '选择项目',
    'project.default': '默认项目',
    'project.new': '新建项目',
    'project.name.placeholder': '输入项目名称',
    'project.edit': '编辑',
    'project.delete': '删除',
    'project.delete.confirm': '确定要删除这个项目吗？该项目下的所有任务将被删除。',
    'project.delete.min': '至少需要保留一个项目！',
    'project.name': '项目',
    'date.start': '开始日期',
    'date.end': '结束日期',
    'date.auto': '自动调整',
    'date.today': '今天',
    'task.name': '任务名称',
    'task.new': '新建任务',
    'task.edit': '编辑任务',
    'task.delete': '删除任务',
    'task.delete.confirm': '确定要删除这个任务吗？',
    'task.new.default': '新任务',
    'task.start.date': '开始日期',
    'task.end.date': '结束日期',
    'task.progress': '进度 (%)',
    'task.color': '颜色',
    'task.assignee': '负责人',
    'task.assignee.placeholder': '输入负责人姓名',
    'task.description': '描述',
    'task.description.placeholder': '任务描述...',
    'task.assignee.label': '负责人:',
    'task.name.header': '任务名称',
    'form.required': '请填写必填字段',
    'form.cancel': '取消',
    'form.save': '保存',
    'empty.select.project': '请先选择一个项目',
    'button.add.task': '添加新任务',
    'language.switch': '切换语言',
    'common.copy': '复制',
    'common.copy.success': '链接已复制到剪贴板',
    'common.copy.failed': '复制失败，请手动复制',
    'project.myProjects': '我的项目',
    'project.invitedProjects': '被邀请的项目',
    'project.noProjects': '暂无项目',
    'permission.denied': '你没有权限执行此操作',
  },
  en: {
    'app.title': 'My Gantt - Project Gantt Chart',
    'project.select': 'Select Project',
    'project.default': 'Default Project',
    'project.new': 'New Project',
    'project.name.placeholder': 'Enter project name',
    'project.edit': 'Edit',
    'project.delete': 'Delete',
    'project.delete.confirm': 'Are you sure you want to delete this project? All tasks under this project will be deleted.',
    'project.delete.min': 'At least one project must be kept!',
    'project.name': 'Project',
    'date.start': 'Start Date',
    'date.end': 'End Date',
    'date.auto': 'Auto Adjust',
    'date.today': 'Today',
    'task.name': 'Task Name',
    'task.new': 'New Task',
    'task.edit': 'Edit Task',
    'task.delete': 'Delete Task',
    'task.delete.confirm': 'Are you sure you want to delete this task?',
    'task.new.default': 'New Task',
    'task.start.date': 'Start Date',
    'task.end.date': 'End Date',
    'task.progress': 'Progress (%)',
    'task.color': 'Color',
    'task.assignee': 'Assignee',
    'task.assignee.placeholder': 'Enter assignee name',
    'task.description': 'Description',
    'task.description.placeholder': 'Task description...',
    'task.assignee.label': 'Assignee:',
    'task.name.header': 'Task Name',
    'form.required': 'Please fill in required fields',
    'form.cancel': 'Cancel',
    'form.save': 'Save',
    'empty.select.project': 'Please select a project first',
    'button.add.task': 'Add New Task',
    'language.switch': 'Switch Language',
    'common.copy': 'Copy',
    'common.copy.success': 'Link copied to clipboard',
    'common.copy.failed': 'Copy failed, please copy manually',
    'project.myProjects': 'My Projects',
    'project.invitedProjects': 'Invited Projects',
    'project.noProjects': 'No Projects',
    'permission.denied': 'You do not have permission to perform this action',
  },
  ja: {
    'app.title': 'My Gantt - プロジェクトガントチャート',
    'project.select': 'プロジェクトを選択',
    'project.default': 'デフォルトプロジェクト',
    'project.new': '新規プロジェクト',
    'project.name.placeholder': 'プロジェクト名を入力',
    'project.edit': '編集',
    'project.delete': '削除',
    'project.delete.confirm': 'このプロジェクトを削除してもよろしいですか？このプロジェクトのすべてのタスクが削除されます。',
    'project.delete.min': '少なくとも1つのプロジェクトを保持する必要があります！',
    'project.name': 'プロジェクト',
    'date.start': '開始日',
    'date.end': '終了日',
    'date.auto': '自動調整',
    'date.today': '今日',
    'task.name': 'タスク名',
    'task.new': '新規タスク',
    'task.edit': 'タスクを編集',
    'task.delete': 'タスクを削除',
    'task.delete.confirm': 'このタスクを削除してもよろしいですか？',
    'task.new.default': '新規タスク',
    'task.start.date': '開始日',
    'task.end.date': '終了日',
    'task.progress': '進捗 (%)',
    'task.color': '色',
    'task.assignee': '担当者',
    'task.assignee.placeholder': '担当者名を入力',
    'task.description': '説明',
    'task.description.placeholder': 'タスクの説明...',
    'task.assignee.label': '担当者:',
    'task.name.header': 'タスク名',
    'form.required': '必須項目を入力してください',
    'form.cancel': 'キャンセル',
    'form.save': '保存',
    'empty.select.project': 'まずプロジェクトを選択してください',
    'button.add.task': '新しいタスクを追加',
    'language.switch': '言語を切り替え',
    'common.copy': 'コピー',
    'common.copy.success': 'リンクがクリップボードにコピーされました',
    'common.copy.failed': 'コピーに失敗しました。手動でコピーしてください',
    'project.myProjects': 'マイプロジェクト',
    'project.invitedProjects': '招待されたプロジェクト',
    'project.noProjects': 'プロジェクトなし',
    'permission.denied': 'この操作を実行する権限がありません',
  },
};

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 从 localStorage 读取保存的语言设置，默认为英文
    const saved = localStorage.getItem('gantt-language') as Language;
    const lang = saved && (saved === 'zh' || saved === 'en' || saved === 'ja') ? saved : 'en';
    // 初始化时设置date-fns的locale
    setDateLocale(lang);
    return lang;
  });

  // 当语言改变时，同步更新date-fns的locale
  useEffect(() => {
    setDateLocale(language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gantt-language', lang);
    setDateLocale(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

