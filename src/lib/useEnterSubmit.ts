// Enter 键提交计算的通用 Hook
import { useEffect } from 'react';

/**
 * 在工具表单区域监听 Enter 键,触发计算。
 * 需要排除 select、textarea 等不需要 Enter 提交的控件。
 */
export function useEnterSubmit(onSubmit: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      // 中文/日文等输入法组词确认的 Enter 不触发计算
      if (e.isComposing) return;
      // 不拦截 select/textarea 中的 Enter
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      onSubmit();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSubmit]);
}
