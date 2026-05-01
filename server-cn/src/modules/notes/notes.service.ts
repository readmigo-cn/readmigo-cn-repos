import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateNoteDto } from './dto/create-note.dto.js';
import { NoteEntity } from './entities/note.entity.js';

@Injectable()
export class NotesService {
  constructor(@InjectRepository(NoteEntity) private readonly notes: Repository<NoteEntity>) {}

  listByBook(userId: string, bookId: string): Promise<NoteEntity[]> {
    return this.notes.find({
      where: { userId, bookId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  list(userId: string): Promise<NoteEntity[]> {
    return this.notes.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  create(userId: string, dto: CreateNoteDto): Promise<NoteEntity> {
    const entity = this.notes.create({
      userId,
      bookId: dto.bookId,
      chapterId: dto.chapterId ?? null,
      blockIndex: dto.blockIndex ?? 0,
      charOffset: dto.charOffset ?? 0,
      charLength: dto.charLength ?? 0,
      originalText: dto.originalText,
      noteText: dto.noteText ?? null,
      kind: dto.kind ?? 'highlight',
      color: dto.color ?? null,
    });
    return this.notes.save(entity);
  }

  async delete(userId: string, id: string): Promise<void> {
    const r = await this.notes.delete({ id, userId });
    if (!r.affected) throw new NotFoundException('note_not_found');
  }
}
