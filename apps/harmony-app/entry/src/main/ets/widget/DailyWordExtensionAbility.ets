import FormExtensionAbility from '@ohos.app.form.FormExtensionAbility';
import formInfo from '@ohos.app.form.formInfo';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

interface DailyWord {
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleEn: string;
  exampleZh: string;
  date: string;
}

const FALLBACK_WORDS: DailyWord[] = [
  {
    word: 'serendipity',
    partOfSpeech: 'noun',
    definition: '美好的偶然；意外发现珍宝的能力',
    exampleEn: 'Finding this little café was pure serendipity.',
    exampleZh: '发现这家小咖啡馆完全是美好的偶然。',
    date: '',
  },
  {
    word: 'ephemeral',
    partOfSpeech: 'adj',
    definition: '短暂的；昙花一现的',
    exampleEn: 'The ephemeral beauty of cherry blossoms.',
    exampleZh: '樱花转瞬即逝的美。',
    date: '',
  },
  {
    word: 'resilient',
    partOfSpeech: 'adj',
    definition: '有韧性的；能快速恢复的',
    exampleEn: 'Children are remarkably resilient.',
    exampleZh: '孩子们的恢复能力惊人。',
    date: '',
  },
  {
    word: 'eloquent',
    partOfSpeech: 'adj',
    definition: '雄辩的；有说服力的',
    exampleEn: 'Her eloquent speech moved the audience.',
    exampleZh: '她雄辩的演讲打动了听众。',
    date: '',
  },
  {
    word: 'meticulous',
    partOfSpeech: 'adj',
    definition: '一丝不苟的；极其细致的',
    exampleEn: 'He is meticulous about every detail.',
    exampleZh: '他对每个细节都一丝不苟。',
    date: '',
  },
  {
    word: 'profound',
    partOfSpeech: 'adj',
    definition: '深刻的；意义深远的',
    exampleEn: 'A profound thought worth pondering.',
    exampleZh: '一个值得深思的深刻想法。',
    date: '',
  },
  {
    word: 'tranquil',
    partOfSpeech: 'adj',
    definition: '宁静的；平和的',
    exampleEn: 'The tranquil lake at dawn.',
    exampleZh: '黎明时分宁静的湖面。',
    date: '',
  },
];

function pickDailyWord(): DailyWord {
  const today = new Date().toISOString().slice(0, 10);
  const idx = today.split('-').reduce((a, s) => a + parseInt(s, 10), 0) % FALLBACK_WORDS.length;
  const word = FALLBACK_WORDS[idx];
  return { ...word, date: today };
}

export default class DailyWordExtensionAbility extends FormExtensionAbility {
  onAddForm(_want: object): formBindingData.FormBindingData {
    return formBindingData.createFormBindingData(pickDailyWord());
  }

  onCastToNormalForm(_formId: string): void {}

  onUpdateForm(formId: string): void {
    const data = pickDailyWord();
    formProvider.updateForm(formId, formBindingData.createFormBindingData(data))
      .catch((err: Error) => console.error(`updateForm err: ${err.message}`));
  }

  onChangeFormVisibility(_newStatus: Record<string, number>): void {}

  onFormEvent(_formId: string, _message: string): void {}

  onRemoveForm(_formId: string): void {}

  onAcquireFormState(_want: object): formInfo.FormState {
    return formInfo.FormState.READY;
  }
}
