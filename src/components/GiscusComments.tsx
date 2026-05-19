import React, { useEffect, useRef } from 'react';

export default function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return;

    const script = document.createElement('script');

    script.src = 'https://giscus.app/client.js';

    script.setAttribute('data-repo', 'stytemv/blog');

    script.setAttribute('data-repo-id', 'R_kgDOShJEDg');

    script.setAttribute('data-category', 'Announcements');

    script.setAttribute('data-category-id', 'DIC_kwDOShJEDs4C9WL_');

    script.setAttribute('data-mapping', 'pathname');

    script.setAttribute('data-strict', '0');

    script.setAttribute('data-reactions-enabled', '1');

    script.setAttribute('data-emit-metadata', '0');

    script.setAttribute('data-input-position', 'bottom');

    script.setAttribute('data-theme', 'preferred_color_scheme');

    script.setAttribute('data-lang', 'ko');

    script.crossOrigin = 'anonymous';

    script.async = true;

    ref.current.appendChild(script);
  }, []);

  return <div ref={ref} />;
}