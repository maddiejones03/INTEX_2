import { useEffect } from 'react';

const BASE = 'Laya Foundation';

type TitleVariant = 'admin' | 'public';

/**
 * Sets document.title (helps demos, SEO, and accessibility).
 * Use variant "public" for marketing/login/donor pages; default is admin sidebar routes.
 */
export function useDocumentTitle(pageTitle: string, variant: TitleVariant = 'admin') {
  useEffect(() => {
    const previous = document.title;
    document.title =
      variant === 'admin' ? `${pageTitle} — Admin | ${BASE}` : `${pageTitle} | ${BASE}`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle, variant]);
}
