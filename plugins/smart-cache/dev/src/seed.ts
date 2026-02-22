import config from '@payload-config';
import { getPayload } from 'payload';
import sharp from 'sharp';

const SKIP_REVALIDATION = { context: { skipRevalidation: true } } as const;

async function generatePlaceholderImage(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: '#4f46e5' },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

const comments = [
  { content: 'Great post! Really enjoyed reading this.' },
  { content: 'Thanks for sharing — this was exactly what I needed.' },
  {
    content: 'Interesting perspective. I had not considered that angle before.',
  },
  {
    content: 'Could you elaborate on the third point? Would love to hear more.',
  },
  { content: 'Bookmarked for later. Solid write-up.' },
  { content: 'This changed how I think about caching strategies.' },
];

const posts = [
  {
    title: 'Getting Started with Payload CMS',
    commentIndices: [0, 1],
    published: true,
  },
  {
    title: 'Understanding Cache Invalidation',
    commentIndices: [2, 3, 5],
    published: true,
  },
  {
    title: 'Building a Plugin Ecosystem',
    commentIndices: [4],
    published: false,
  },
];

const payload = await getPayload({ config });

const imageBuffer = await generatePlaceholderImage();
const media = await payload.create({
  collection: 'media',
  data: {},
  file: {
    data: imageBuffer,
    mimetype: 'image/jpeg',
    name: 'placeholder.jpg',
    size: imageBuffer.byteLength,
  },
  ...SKIP_REVALIDATION,
});

const commentDocs = await Promise.all(
  comments.map((data) =>
    payload.create({ collection: 'comments', data, ...SKIP_REVALIDATION }),
  ),
);

await Promise.all(
  posts.map(({ title, commentIndices, published }) =>
    payload.create({
      collection: 'posts',
      data: {
        title,
        image: media.id,
        comments: commentIndices.map((i) => commentDocs[i].id),
        _status: published ? 'published' : 'draft',
      },
      ...SKIP_REVALIDATION,
    }),
  ),
);

payload.logger.info('— Seed data created: 1 image, 6 comments, 3 posts');

process.exit(0);
