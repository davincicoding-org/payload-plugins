'use client';

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
    </div>
  );
}
