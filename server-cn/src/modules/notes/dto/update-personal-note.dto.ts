import { PartialType } from '@nestjs/swagger';

import { CreatePersonalNoteDto } from './create-personal-note.dto.js';

export class UpdatePersonalNoteDto extends PartialType(CreatePersonalNoteDto) {}
