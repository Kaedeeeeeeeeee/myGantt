import { format, eachDayOfInterval, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, Locale } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';
import { Language } from '../contexts/I18nContext';

const localeMap: Record<Language, Locale> = {
  zh: zhCN,
  en: enUS,
  ja: ja,
};

// 全局语言变量，由I18nProvider设置
let currentLanguage: Language = 'zh';

export const setDateLocale = (lang: Language) => {
  currentLanguage = lang;
};

export const getDateLocale = (): Locale => {
  return localeMap[currentLanguage] || zhCN;
};

export const formatDate = (date: Date, formatStr: string = 'yyyy-MM-dd'): string => {
  return format(date, formatStr, { locale: getDateLocale() });
};

// 格式化年月显示（根据语言使用不同的格式）
export const formatYearMonth = (date: Date, language: Language): string => {
  const locales: Record<Language, Locale> = {
    zh: zhCN,
    en: enUS,
    ja: ja,
  };
  const locale = locales[language] || zhCN;
  
  switch (language) {
    case 'zh':
      return format(date, 'yyyy年MM月', { locale });
    case 'en':
      return format(date, 'MMMM yyyy', { locale });
    case 'ja':
      return format(date, 'yyyy年MM月', { locale });
    default:
      return format(date, 'yyyy年MM月', { locale });
  }
};

export const getDaysInRange = (start: Date, end: Date): Date[] => {
  return eachDayOfInterval({ start, end });
};

export const getWeeksInRange = (start: Date, end: Date): Date[] => {
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
};

export const getMonthsInRange = (start: Date, end: Date): Date[] => {
  return eachMonthOfInterval({ start, end });
};

export const getCellWidth = (viewMode: 'day' | 'week' | 'month'): number => {
  switch (viewMode) {
    case 'day':
      return 40;
    case 'week':
      return 60;
    case 'month':
      return 100;
    default:
      return 40;
  }
};

export const getDaysBetween = (start: Date, end: Date): number => {
  // 标准化日期到当天的开始时间（00:00:00），避免时间部分影响计算
  const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffTime = endNormalized.getTime() - startNormalized.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
