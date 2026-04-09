import { useEffect } from 'react';

const BASE = 'Laya Foundation';

/**
 * Sets document.title for admin routes (helps Lighthouse SEO/accessibility audits).
 */
export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${pageTitle} — Admin | ${BASE}`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}
