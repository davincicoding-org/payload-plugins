import { fetchPosts } from '@/server';
import styles from './page.module.css';

export default async function HomePage() {
  const posts = await fetchPosts();

  return (
    <main>
      <h1>Posts</h1>
      <div className={styles.grid}>
        {posts.map((post) => (
          <div className={styles.post} key={post.id}>
            {typeof post.image === 'object' &&
              typeof post.image?.url === 'string' && (
                <img
                  alt={post.title}
                  className={styles.postImage}
                  src={post.image.url}
                />
              )}
            <div className={styles.postContent}>
              <span>{post.title}</span>
              {(post.comments || []).length > 0 && (
                <span>{post.comments?.length} comments</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
