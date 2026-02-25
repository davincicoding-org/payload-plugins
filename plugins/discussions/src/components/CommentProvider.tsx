'use client';

import type {
  DocumentID,
  DocumentReference,
} from '@davincicoding/payload-plugin-kit';
import { useEndpointCallers } from '@davincicoding/payload-plugin-kit/client';
import { useCallback, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/const';
import type { PopulatedComment } from '../types';
import { CommentContext, type CommentContextValue } from './CommentContext';

export interface CommentProviderProps {
  readonly initialComments: readonly PopulatedComment[];
  readonly documentReference: DocumentReference;
  readonly maxDepth: number;
  readonly children: React.ReactNode;
}

export function CommentProvider({
  initialComments,
  documentReference,
  maxDepth,
  children,
}: CommentProviderProps) {
  const api = useEndpointCallers(ENDPOINTS);

  const [comments, setComments] =
    useState<readonly PopulatedComment[]>(initialComments);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const openReply = useCallback((id: string) => {
    setActiveReplyId(id);
  }, []);

  const closeReply = useCallback(() => {
    setActiveReplyId(null);
  }, []);

  const submitReply = useCallback(
    async (parentId: string | null, content: string) => {
      if (parentId === null) {
        const populated = await api.createComment({
          content,
          documentReference,
        });
        setComments((prev) => [populated, ...prev]);
        setActiveReplyId(null);
        return;
      }

      const populated = await api.createReply({
        parentId: parentId as DocumentID,
        content,
      });

      const insertReply = (
        items: readonly PopulatedComment[],
      ): PopulatedComment[] =>
        items.map((item) =>
          item.id === parentId
            ? { ...item, replies: [...(item.replies || []), populated] }
            : {
                ...item,
                replies: item.replies ? insertReply(item.replies) : null,
              },
        );

      setComments((prev) => insertReply(prev));
      setActiveReplyId(null);
    },
    [api, documentReference],
  );

  const value = useMemo<CommentContextValue>(
    () => ({
      comments,
      activeReplyId,
      maxDepth,
      openReply,
      closeReply,
      submitReply,
    }),
    [comments, activeReplyId, maxDepth, openReply, closeReply, submitReply],
  );

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
}
