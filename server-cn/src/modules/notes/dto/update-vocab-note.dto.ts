import { PartialType } from '@nestjs/swagger';

import { CreateVocabNoteDto } from './create-vocab-note.dto.js';

/** 所有字段均可选，仅更新传入的字段 */
export class UpdateVocabNoteDto extends PartialType(CreateVocabNoteDto) {}
