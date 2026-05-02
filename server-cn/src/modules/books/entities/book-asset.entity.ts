import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AssetType = 'epub' | 'cover-thumb' | 'cover-large' | 'audio';

@Entity('book_assets')
export class BookAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 64 })
  bookId!: string;

  @Column({ length: 16 })
  assetType!: AssetType;

  @Column({ length: 512 })
  url!: string;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes!: number | null;

  @Column({ length: 128, nullable: true })
  mimeType!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
