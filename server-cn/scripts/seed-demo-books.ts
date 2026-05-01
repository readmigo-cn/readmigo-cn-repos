/**
 * 灌入 demo 图书。运行：
 *   pnpm tsx scripts/seed-demo-books.ts
 * 已存在的会跳过。
 */
import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source.js';
import { BookEntity } from '../src/modules/books/entities/book.entity.js';

const DEMO_BOOKS: Partial<BookEntity>[] = [
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    coverUrl: 'https://standardebooks.org/images/covers/jane-austen_pride-and-prejudice@2x.jpg',
    description: 'A timeless classic of love and social commentary in early 19th-century England.',
    language: 'en',
    cefrLevel: 'B2',
    totalChapters: 61,
    source: 'standard-ebooks',
    isPublished: true,
  },
  {
    id: 'the-adventures-of-sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    coverUrl: 'https://standardebooks.org/images/covers/arthur-conan-doyle_the-adventures-of-sherlock-holmes@2x.jpg',
    description: 'Twelve celebrated mystery stories featuring the world\'s greatest detective.',
    language: 'en',
    cefrLevel: 'B1',
    totalChapters: 12,
    source: 'standard-ebooks',
    isPublished: true,
  },
  {
    id: 'the-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: 'https://standardebooks.org/images/covers/f-scott-fitzgerald_the-great-gatsby@2x.jpg',
    description: 'The American dream, lost love, and the Jazz Age decadence on Long Island.',
    language: 'en',
    cefrLevel: 'B2',
    totalChapters: 9,
    source: 'standard-ebooks',
    isPublished: true,
  },
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    coverUrl: 'https://standardebooks.org/images/covers/lewis-carroll_alices-adventures-in-wonderland@2x.jpg',
    description: 'A young girl falls down a rabbit hole into a fantasy world of peculiar creatures.',
    language: 'en',
    cefrLevel: 'A2',
    totalChapters: 12,
    source: 'standard-ebooks',
    isPublished: true,
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    coverUrl: 'https://standardebooks.org/images/covers/mary-shelley_frankenstein@2x.jpg',
    description: 'A young scientist creates life and is horrified by what he has wrought.',
    language: 'en',
    cefrLevel: 'C1',
    totalChapters: 24,
    source: 'standard-ebooks',
    isPublished: true,
  },
];

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(BookEntity);
  let inserted = 0;
  let skipped = 0;
  for (const b of DEMO_BOOKS) {
    const exists = await repo.findOne({ where: { id: b.id! } });
    if (exists) {
      skipped++;
      continue;
    }
    await repo.save(repo.create(b));
    inserted++;
  }
  console.log(`Seeded: ${inserted} inserted, ${skipped} skipped (already exist)`);
  await AppDataSource.destroy();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
