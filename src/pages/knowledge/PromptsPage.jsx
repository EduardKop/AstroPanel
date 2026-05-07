import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clipboard,
  CornerDownRight,
  MessageSquareText,
} from 'lucide-react';

const FILTERS = [
  { key: 'refunds', label: 'Возвраты' },
  { key: 'objections', label: 'Возражения' },
];

const FINAL_OFFER = 'Я бы могла предложить другой вариант, возможно тебе подойдет возврат 50% стоимости и дополнительно я сделаю для тебя расклад ТАРО, мои клиенты очень довольны ТАРО раскладом, что скажешь?';

const PAIN_BINDING = 'Делаем привязку к болям клиента. Например: Таро покажет почему ты не можешь найти парня, это уже даст четкое понимание и что где нужно изменить, то что ты обратилась ...';

const NO_REASON_PROMPT = {
  role: 'Ты - эксперт-практик в области Таро и психологии. Ты умеешь переводить абстрактные смыслы на язык конкретных выгод для клиента. Твой стиль общения - дружелюбный, экспертный, без лишнего официоза.',
  context: 'Мы уже предложили клиенту заменить возврат за натальную карту на Таро-расклад. Теперь нужно отправить второе сообщение "дожим", которое окончательно свяжет его текущую боль с пользой Таро.',
  input: 'Боли клиента (что его беспокоит прямо сейчас): [ВСТАВИТЬ БОЛИ]',
  task: 'Напиши короткое, емкое сообщение до 400 знаков для мессенджера, которое станет финальным аргументом.',
  structure: [
    'Связка с реальностью: Напомни, что натальная карта - это общая стратегия на годы, а его ситуация [Боль] требует решения в моменте.',
    'Механика решения: Коротко объясни, как именно Таро поможет. Например: "Разберем по шагам, что делать завтра, чтобы ситуация изменилась".',
    'Эмоциональный триггер: Опиши состояние клиента после расклада: ясность, спокойствие, понимание пути.',
    'Мягкий призыв: Предложи запустить процесс. Например: "Если готова, давай начнем, и уже через час у тебя будет пошаговый план".',
  ],
  tone: 'Менее формальный, человечный, поддерживающий, но сохраняющий позицию сильного эксперта. Не используй клише "уникальное предложение" или "спеши купить".',
};

const BAD_REVIEWS_PROMPT = {
  role: 'Ты - мудрый проводник и эксперт в астрологии и самопознании. Твой стиль общения теплый, личный и глубокий, но при этом ты остаешься профессионалом. Избегай канцеляризмов и официоза.',
  context: 'Клиент хочет сделать возврат за натальную карту. Мы уже предложили альтернативу: глубокий разбор текущей ситуации, и теперь нужно отправить сообщение, которое объяснит, что его обращение именно сейчас - не случайность.',
  input: 'Боли клиента: [ВСТАВИТЬ БОЛИ]',
  task: 'Напиши сообщение для мессенджера, которое убедит клиента не уходить, а решить вопрос прямо сейчас.',
  structure: [
    'Синхронность: Подчеркни, что в мире ничего не происходит просто так. То, что клиент написала именно сегодня, в момент пика своей боли [Боль] - это важный сигнал, который нельзя игнорировать.',
    'Энергия момента: Объясни, что если сейчас "откатить" все назад и сделать возврат, энергия решения проблемы затухнет, и ситуация может законсервироваться.',
    'Фокус на решении: Мы не просто "не возвращаем деньги", мы предлагаем формат, который даст ответ на его запрос [Потребность] максимально быстро, пока есть этот импульс.',
    'Личное участие: Покажи, что ты как эксперт видишь эту связь и готова включиться в его ситуацию именно сейчас, потому что "поле" открыто.',
  ],
  tone: 'Искренний, немного доверительный, без давления, но с мягкой уверенностью. Используй разговорные обороты, чтобы это не выглядело как скрипт продаж. Объем: кратко и в точку, до 500 знаков.',
};

const OBJECTIONS_PROMPTS = [
  {
    title: 'Нет денег / дорого',
    fileName: 'no-money.prompt',
    fields: [
      {
        key: 'pain',
        label: 'Боли клиента',
        placeholder: 'Например: страх остаться одной, тревога, неопределенность',
        type: 'textarea',
        fallbacks: {
          insert: '[ВСТАВИТЬ БОЛИ]',
          short: '[БОЛИ]',
        },
      },
      {
        key: 'currentProduct',
        label: 'Текущий продукт',
        placeholder: 'Например: натальная карта',
        fallbacks: {
          insert: '[ВСТАВИТЬ НАЗВАНИЕ ТЕКУЩЕГО ПРОДУКТА]',
          short: '[НАЗВАНИЕ ТЕКУЩЕГО ПРОДУКТА]',
        },
      },
      {
        key: 'currentPrice',
        label: 'Цена текущего продукта',
        placeholder: 'Например: 79 EUR',
        fallbacks: {
          insert: '[ВСТАВИТЬ ЦЕНУ ТЕКУЩЕГО ПРОДУКТА]',
        },
      },
      {
        key: 'tarotPrice',
        label: 'Новое предложение (Таро)',
        placeholder: 'Например: 29 EUR',
        fallbacks: {
          insert: '[ВСТАВИТЬ ЦЕНУ ТАРО]',
          short: '[ЦЕНА ТАРО]',
        },
      },
    ],
    template: [
      'Роль: Ты - мудрая женщина, таролог и астролог. Ты общаешься как "проводник", который видит суть вещей за обычными словами. Твой тон - теплый, поддерживающий, доверительный и на "ты". Ты не продаешь услугу, ты помогаешь человеку не упустить шанс изменить жизнь.',
      '',
      'Контекст: Клиентка говорит, что цена {{currentProduct:short}} для неё сейчас высока. Твоя цель - предложить альтернативу в виде Таро-расклада, сделав упор на то, что её обращение именно сейчас - это мощный знак, который нельзя игнорировать.',
      '',
      'Вводные данные:',
      '- Боли клиента: {{pain:insert}}',
      '- Текущий продукт: {{currentProduct:insert}}',
      '- Цена текущего продукта: {{currentPrice:insert}}',
      '- Новое предложение (Таро): {{tarotPrice:insert}}',
      '',
      'Задача: Напиши сообщение для мессенджера, соблюдая следующую структуру:',
      '- Сила момента (Знак): Начни с того, что ты почувствовала её запрос очень остро. Скажи, что то, что она написала именно сегодня, в разгар своих переживаний о {{pain:short}} - это не случайность, а знак. Вселенная дала ей импульс решить вопрос, и важно не дать этому импульсу угаснуть.',
      '- Экологичное признание цены: Мягко скажи, что ты понимаешь вопрос стоимости {{currentProduct:short}}. Но подчеркни: если закрыта одна дверь, всегда открывается другая, более подходящая сейчас.',
      '- Оффер Таро как "хирургическое решение": Предложи глубокий Таро-расклад за {{tarotPrice:short}}. Опиши его как способ получить "концентрат" ответов здесь и сейчас. Это дешевле и быстрее, чем {{currentProduct:short}}, но именно этот инструмент идеально подходит, чтобы снять текущую боль {{pain:short}}.',
      '- Фокус на ценности спокойствия: Напомни, что время и внутренняя тишина - это самый дорогой ресурс. Спроси, готова ли она довериться этому знаку и выбрать ясность прямо сейчас вместо того, чтобы снова остаться один на один с неопределенностью.',
      '',
      'Особые требования:',
      '- Никаких упоминаний PayPo, Klarna, карт или методов оплаты.',
      '- Тон женственный, интуитивный, но уверенный.',
      '- Без давления, только предложение помощи через понимание знаков судьбы.',
      '- Объем: ёмкое сообщение, которое легко читается с экрана смартфона.',
    ].join('\n'),
  },
  {
    title: 'Думала это бесплатно',
    fileName: 'free-expectation.prompt',
    fields: [
      {
        key: 'pain',
        label: 'Боли клиента',
        placeholder: 'Например: тревога после расставания, страх ошибки',
        type: 'textarea',
        fallbacks: {
          insert: '[ВСТАВИТЬ БОЛИ]',
          singular: '[БОЛЬ]',
        },
      },
      {
        key: 'tarotName',
        label: 'Вариант 1 (Таро) - название',
        placeholder: 'Например: Таро-расклад',
        fallbacks: {
          short: '[НАЗВАНИЕ]',
        },
      },
      {
        key: 'tarotPrice',
        label: 'Вариант 1 (Таро) - цена',
        placeholder: 'Например: 29 EUR',
        fallbacks: {
          short: '[ЦЕНА]',
        },
      },
      {
        key: 'currentName',
        label: 'Вариант 2 (Текущий продукт) - название',
        placeholder: 'Например: натальная карта',
        fallbacks: {
          short: '[НАЗВАНИЕ]',
          product: '[НАЗВАНИЕ ПРОДУКТА]',
        },
      },
      {
        key: 'currentPrice',
        label: 'Вариант 2 (Текущий продукт) - цена',
        placeholder: 'Например: 79 EUR',
        fallbacks: {
          short: '[ЦЕНА]',
        },
      },
    ],
    template: [
      'Роль: Ты - мудрая женщина, эксперт в области Таро и западной астрологии. Твой стиль - уверенный, поддерживающий, но земной. Ты общаешься на "ты", как опытный наставник, который ценит свое время и время клиента. Избегай клише вроде "милая", "дорогая" и слова "энергообмен".',
      '',
      'Контекст: Клиентка ожидала бесплатную помощь. Твоя задача - объяснить, что профессиональная работа с ситуацией требует оплаты, иначе она не даст реального результата. Предложи два варианта на выбор, подчеркнув, что её обращение именно сегодня - это важный сигнал её интуиции.',
      '',
      'Вводные данные:',
      '- Боли клиента: {{pain:insert}}',
      '- Вариант 1 (Таро): {{tarotName:short}} - {{tarotPrice:short}}. Акцент на скорости и точечном решении боли.',
      '- Вариант 2 (Текущий продукт): {{currentName:short}} - {{currentPrice:short}}. Акцент на глубине и долгосрочном плане.',
      '',
      'Задача: Напиши сообщение для мессенджера по следующей структуре:',
      '- Прямота и понимание: Спокойно и доброжелательно начни с того, что понимаешь её ожидания. Но честно скажи: для того чтобы ситуация с {{pain:singular}} действительно сдвинулась с мертвой точки, в работу нужно вложиться. Бесплатные советы часто остаются просто словами, а оплата - это первый шаг к реальным переменам.',
      '- Синхроничность (Знак): Подсвети, что то, что она написала именно сейчас, когда внутри так остро болит {{pain:singular}} - это не случайность. Это её импульс на выход из кризиса. Будет жаль упустить этот момент и оставить всё как есть.',
      '- Вилка выбора: Предложи два конкретных пути:',
      '  - Путь 1: Расклад Таро ({{tarotPrice:short}}). Это "скорая помощь", чтобы прямо сейчас снять тревогу, увидеть правду и понять, что делать завтра.',
      '  - Путь 2: Глубокий анализ {{currentName:product}} ({{currentPrice:short}}). Это для тех, кто хочет не просто "залатать", а полную перепрошивку ситуации и пошаговую карту на будущее.',
      '- Финальный вопрос: Спроси, какой формат ей сейчас ближе, чтобы начать менять ситуацию уже сегодня.',
      '',
      'Запрещенные слова: энергообмен, милая, дорогая, бесплатно, Вселенная (в избытке).',
      'Стиль: Искренний, экспертный, лаконичный.',
    ].join('\n'),
  },
];

const renderTemplate = (template, fields = [], values = {}) => {
  const fieldsByKey = fields.reduce((acc, field) => {
    acc[field.key] = field;
    return acc;
  }, {});

  return template.replace(/{{(\w+)(?::(\w+))?}}/g, (match, key, variant = 'short') => {
    const value = values[key]?.trim();
    if (value) return value;

    const field = fieldsByKey[key];
    return field?.fallbacks?.[variant] || field?.fallbacks?.short || field?.fallbacks?.insert || match;
  });
};

const buildPromptCopy = (prompt) => [
  `Роль: ${prompt.role}`,
  '',
  `Контекст: ${prompt.context}`,
  '',
  'Вводные данные:',
  prompt.input,
  '',
  `Задача: ${prompt.task}`,
  '',
  'Структура сообщения:',
  ...prompt.structure.map((item) => `- ${item}`),
  '',
  `Тон: ${prompt.tone}`,
].join('\n');

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const CopyableBlock = ({
  children,
  text,
  className = '',
  contentClassName = '',
  title = 'Кликни, чтобы скопировать',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1100);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Скопировано' : title}
      className={`group relative block w-full cursor-copy text-left transition-all duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#0A0A0A] ${className}`}
    >
      <span className={`block ${contentClassName}`}>{children}</span>
      <span className={`pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-black shadow-sm transition-opacity ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-100 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'border-gray-200 bg-white/90 text-gray-500 opacity-0 group-hover:opacity-100 dark:border-[#333] dark:bg-[#181818] dark:text-gray-400'
      }`}>
        {copied ? <Check size={11} /> : <Clipboard size={11} />}
        {copied ? 'Скопировано' : 'Копировать'}
      </span>
    </button>
  );
};

const MiroBoard = ({ children, className = '' }) => (
  <div className={`rounded-md border border-gray-200 bg-[#F4F4F0] p-3 font-mono text-[12px] shadow-sm dark:border-[#2A2A2A] dark:bg-[#0E0E0C] md:p-5 ${className}`}>
    <div className="rounded-md bg-[radial-gradient(circle_at_1px_1px,rgba(17,24,39,0.10)_1px,transparent_0)] [background-size:20px_20px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)]">
      {children}
    </div>
  </div>
);

const HorizontalConnector = () => (
  <div className="hidden h-full min-w-10 items-center md:flex" aria-hidden="true">
    <div className="h-0.5 flex-1 bg-gray-800 dark:bg-gray-500" />
    <ArrowRight size={18} strokeWidth={2.6} className="-ml-1 shrink-0 text-gray-800 dark:text-gray-500" />
  </div>
);

const VerticalConnector = () => (
  <div className="flex h-12 flex-col items-center justify-center text-gray-800 dark:text-gray-500" aria-hidden="true">
    <div className="w-0.5 flex-1 bg-gray-800 dark:bg-gray-500" />
    <ArrowDown size={18} strokeWidth={2.6} className="-mt-1 shrink-0" />
  </div>
);

const StickyNote = ({ children, tone = 'yellow' }) => {
  const tones = {
    yellow: 'bg-yellow-200 text-yellow-950 shadow-yellow-900/10 dark:bg-yellow-300 dark:text-yellow-950',
    red: 'bg-red-600 text-white shadow-red-900/20',
  };
  const text = typeof children === 'string' ? children : '';

  return (
    <CopyableBlock
      text={text}
      className={`min-h-[74px] rounded-sm px-3 py-3 text-center text-[11px] font-black leading-snug shadow-md ${tones[tone]}`}
      contentClassName="flex min-h-[48px] items-center justify-center pr-1"
    >
      {children}
    </CopyableBlock>
  );
};

const RouteTag = ({ children }) => (
  <CopyableBlock
    text={children}
    className="mx-auto mb-2 max-w-max rounded px-2 py-1 text-center text-xs font-black text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
    contentClassName="pr-14"
  >
    {children}
  </CopyableBlock>
);

const MessageBox = ({ children, text, className = '', centered = true }) => {
  const copyText = text || (typeof children === 'string' ? children : '');

  return (
    <CopyableBlock
      text={copyText}
      className={`rounded-sm border-2 border-gray-900 bg-white px-4 py-3 text-[12px] leading-5 text-gray-900 shadow-[0_2px_0_rgba(17,24,39,0.08)] dark:border-[#666] dark:bg-[#101010] dark:text-gray-100 ${centered ? 'text-center' : ''} ${className}`}
      contentClassName="pr-12"
    >
      {children}
    </CopyableBlock>
  );
};

const PromptReference = () => (
  <CopyableBlock
    text="Используем промпт на основе смс с потребностями клиента"
    className="rounded-sm bg-white/85 px-3 py-2 text-[12px] font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-[#121212]/90 dark:text-gray-300 dark:ring-[#333]"
    contentClassName="flex items-start gap-2 pr-14"
  >
    <CornerDownRight size={18} className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
    <span>Используем промпт на основе смс с потребностями клиента</span>
  </CopyableBlock>
);

const PromptText = ({ prompt, title = 'prompt.txt', text }) => {
  const promptText = text || buildPromptCopy(prompt);

  return (
    <div className="overflow-hidden rounded-md border border-[#30363D] bg-[#0D1117] text-[11px] leading-5 shadow-sm sm:text-[12px]">
      <div className="flex items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-3 py-2">
        <div className="font-mono text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</div>
        <CopyableBlock
          text={promptText}
          className="w-auto rounded-sm border border-[#30363D] bg-[#21262D] px-3 py-1.5 font-mono text-[10px] font-black text-slate-100 hover:bg-[#30363D]"
          contentClassName="pr-14"
          title="Скопировать весь промпт"
        >
          Весь промпт
        </CopyableBlock>
      </div>

      <div className="px-3 py-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-slate-200">{promptText}</pre>
      </div>
    </div>
  );
};

const PromptVariablePanel = ({ fields, values, onChange }) => (
  <div className="mb-3 overflow-hidden rounded-md border border-[#30363D] bg-[#0D1117] shadow-sm">
    <div className="border-b border-[#30363D] bg-[#161B22] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wide text-slate-400">
      vars
    </div>

    <div className="grid gap-3 p-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
          <span className="mb-1 block font-mono text-[10px] font-black uppercase tracking-wide text-slate-400">
            {field.label}
          </span>
          {field.type === 'textarea' ? (
            <textarea
              value={values[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)}
              rows={2}
              placeholder={field.placeholder}
              className="min-h-[58px] w-full resize-y rounded-sm border border-[#30363D] bg-[#161B22] px-3 py-2 font-mono text-[12px] leading-5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <input
              type="text"
              value={values[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              className="h-9 w-full rounded-sm border border-[#30363D] bg-[#161B22] px-3 font-mono text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          )}
        </label>
      ))}
    </div>
  </div>
);

const ObjectionPromptCard = ({ prompt }) => {
  const [values, setValues] = useState({});
  const promptText = renderTemplate(prompt.template, prompt.fields, values);

  const handleChange = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="min-w-0">
      <div className="mb-4">
        <span className="inline-block rounded-sm bg-red-700 px-3 py-1.5 text-xl font-black leading-none text-white shadow-sm sm:text-2xl">
          {prompt.title}
        </span>
      </div>

      <PromptVariablePanel fields={prompt.fields} values={values} onChange={handleChange} />
      <PromptText title={prompt.fileName} text={promptText} />
    </section>
  );
};

const FlowPair = ({ note, route, message, noteTone = 'yellow' }) => (
  <div className="grid items-center gap-3 md:grid-cols-[128px_40px_minmax(0,1fr)]">
    <StickyNote tone={noteTone}>{note}</StickyNote>
    <HorizontalConnector />
    <div>
      {route && <RouteTag>{route}</RouteTag>}
      <MessageBox>{message}</MessageBox>
    </div>
  </div>
);

const FollowUpChain = () => (
  <div className="mx-auto flex max-w-md flex-col items-stretch">
    <VerticalConnector />
    <MessageBox>{FINAL_OFFER}</MessageBox>
    <VerticalConnector />
    <MessageBox className="italic">{PAIN_BINDING}</MessageBox>
    <VerticalConnector />
    <PromptReference />
  </div>
);

const RefundsFlow = () => (
  <MiroBoard>
    <div className="space-y-8 p-3 md:p-5">
      <section className="mx-auto max-w-3xl">
        <FlowPair
          note="Если не говорит причину сразу"
          route="/reasonReturn"
          message="Мне очень жаль это слышать, подскажи почему приняла такое решение, что повлияло?"
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-md border border-gray-200/70 bg-white/35 p-4 shadow-sm dark:border-[#292929] dark:bg-black/10">
          <FlowPair
            note="Если все таки не сказал причину"
            route="/NoReasonReturn"
            message="Я уже начала процесс подготовки продукта для тебя, мне очень жаль что ты хочешь остановить процесс, я могу предложить несколько вариантов, можем сделать возврат, но будет потрачена комиссия - это 8% стоимости, и ты потеряешь место."
          />

          <FollowUpChain />

          <div className="mt-6">
            <PromptText prompt={NO_REASON_PROMPT} />
          </div>
        </section>

        <section className="rounded-md border border-gray-200/70 bg-white/35 p-4 shadow-sm dark:border-[#292929] dark:bg-black/10">
          <FlowPair
            note="Если причина отзывы"
            route="/badReviewsReturn"
            message="Это делают мои конкуренты, я уже подавала жалобы на них, могу заверить, что все без исключения мои клиенты очень довольны всеми продуктами. Я могу предложить тебе получить все таки натальную карту, которую я уже начала делать. Если тебя что либо не устроит, мы в процессе сможем вернуть деньги."
          />

          <div className="mx-auto mt-8 max-w-xl space-y-6">
            <VerticalConnector />
            <PromptReference />
            <PromptText prompt={BAD_REVIEWS_PROMPT} />
          </div>
        </section>
      </div>

      <section className="rounded-md border border-gray-200/70 bg-white/35 p-4 shadow-sm dark:border-[#292929] dark:bg-black/10">
        <div className="mx-auto max-w-[180px]">
          <StickyNote tone="red">Если все же отказывается</StickyNote>
        </div>

        <FollowUpChain />

        <div className="mx-auto mt-6 max-w-3xl">
          <PromptText prompt={NO_REASON_PROMPT} />
        </div>
      </section>
    </div>
  </MiroBoard>
);

const ObjectionsFlow = () => (
  <MiroBoard>
    <div className="grid gap-8 p-3 md:p-5 xl:grid-cols-2">
      {OBJECTIONS_PROMPTS.map((prompt) => (
        <ObjectionPromptCard key={prompt.title} prompt={prompt} />
      ))}
    </div>
  </MiroBoard>
);

const PromptsPage = () => {
  const [activeFilter, setActiveFilter] = useState(FILTERS[0].key);

  return (
    <div className="animate-in fade-in zoom-in font-mono duration-300 pb-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
            <MessageSquareText className="text-indigo-500" size={22} />
            Промпты
          </h2>
        </div>

        <div className="flex w-full rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-[#333] dark:bg-[#111] md:w-auto">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`min-h-8 flex-1 rounded-md px-4 text-[11px] font-black transition-colors md:flex-none ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeFilter === 'refunds' ? <RefundsFlow /> : <ObjectionsFlow />}
    </div>
  );
};

export default PromptsPage;
