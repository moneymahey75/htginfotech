import React, { useEffect, useState } from 'react';
import {
  ContentKey,
  CONTENT_NOT_AVAILABLE,
  getContentByKey,
  hasUsableContent,
  sanitizeManagedHtml,
} from '../../lib/content';

interface ManagedContentProps {
  contentKey: ContentKey;
  className?: string;
}

const ManagedContent: React.FC<ManagedContentProps> = ({ contentKey, className = '' }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      setLoading(true);
      const entry = await getContentByKey(contentKey);
      if (isMounted) {
        setContent(entry?.content || null);
        setLoading(false);
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [contentKey]);

  if (loading) {
    return <div className={`managed-content ${className}`}>Loading...</div>;
  }

  if (!hasUsableContent(content)) {
    return <div className={`managed-content ${className}`}>{CONTENT_NOT_AVAILABLE}</div>;
  }

  return (
    <div
      className={`managed-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeManagedHtml(content || '') }}
    />
  );
};

export default ManagedContent;
