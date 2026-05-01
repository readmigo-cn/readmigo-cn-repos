import { Injectable } from '@nestjs/common';

interface DailyWord {
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleEn: string;
  exampleZh: string;
  date: string;
}

const POOL: Omit<DailyWord, 'date'>[] = [
  { word: 'serendipity', partOfSpeech: 'noun', definition: '美好的偶然；意外发现珍宝的能力', exampleEn: 'Finding this little café was pure serendipity.', exampleZh: '发现这家小咖啡馆完全是美好的偶然。' },
  { word: 'ephemeral', partOfSpeech: 'adj', definition: '短暂的；昙花一现的', exampleEn: 'The ephemeral beauty of cherry blossoms.', exampleZh: '樱花转瞬即逝的美。' },
  { word: 'resilient', partOfSpeech: 'adj', definition: '有韧性的；能快速恢复的', exampleEn: 'Children are remarkably resilient.', exampleZh: '孩子们的恢复能力惊人。' },
  { word: 'eloquent', partOfSpeech: 'adj', definition: '雄辩的；有说服力的', exampleEn: 'Her eloquent speech moved the audience.', exampleZh: '她雄辩的演讲打动了听众。' },
  { word: 'meticulous', partOfSpeech: 'adj', definition: '一丝不苟的；极其细致的', exampleEn: 'He is meticulous about every detail.', exampleZh: '他对每个细节都一丝不苟。' },
  { word: 'profound', partOfSpeech: 'adj', definition: '深刻的；意义深远的', exampleEn: 'A profound thought worth pondering.', exampleZh: '一个值得深思的深刻想法。' },
  { word: 'tranquil', partOfSpeech: 'adj', definition: '宁静的；平和的', exampleEn: 'The tranquil lake at dawn.', exampleZh: '黎明时分宁静的湖面。' },
  { word: 'audacious', partOfSpeech: 'adj', definition: '大胆的；无畏的', exampleEn: 'An audacious plan to climb the peak.', exampleZh: '一个大胆的登顶计划。' },
  { word: 'whimsical', partOfSpeech: 'adj', definition: '异想天开的；古怪可爱的', exampleEn: 'A whimsical drawing on the wall.', exampleZh: '墙上一幅古怪可爱的画。' },
  { word: 'pristine', partOfSpeech: 'adj', definition: '原始的；未受破坏的', exampleEn: 'A pristine forest untouched by humans.', exampleZh: '一片未被人类触碰的原始森林。' },
];

@Injectable()
export class WidgetService {
  getDailyWord(): DailyWord {
    const today = new Date().toISOString().slice(0, 10);
    const idx = today.split('-').reduce((a, s) => a + parseInt(s, 10), 0) % POOL.length;
    return { ...POOL[idx], date: today };
  }
}
