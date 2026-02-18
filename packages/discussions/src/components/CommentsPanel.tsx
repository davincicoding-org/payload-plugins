'use client';

import { ScrollArea } from '@base-ui/react/scroll-area';
import { CommentComposer } from './CommentComposer';
import { useCommentContext } from './CommentContext';
import styles from './CommentsPanel.module.css';
import { CommentThread } from './CommentThread';

export function CommentsPanel() {
  const { comments, closeReply, submitReply } = useCommentContext();

  return (
    <div className={styles.root}>
      <CommentComposer
        onFocus={closeReply}
        onSubmit={(content) => submitReply(null, content)}
        placeholder="Add a comment..."
        submitLabel="Comment"
      />

      <ScrollArea.Root className={styles.scrollArea}>
        <ScrollArea.Viewport className={styles.viewport}>
          <ScrollArea.Content>
            {comments.length === 0 ? (
              <div className={styles.placeholder}>
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className={styles.list}>
                {comments.map((comment) => (
                  <CommentThread comment={comment} depth={0} key={comment.id} />
                ))}
              </div>
            )}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className={styles.scrollbar}>
          <ScrollArea.Thumb className={styles.thumb} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
