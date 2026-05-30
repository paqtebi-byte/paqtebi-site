import { GoogleGenAI, Type } from "@google/genai";
import { Article } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

type AiImageTheme = 'business' | 'research' | 'chip' | 'robotics' | 'safety' | 'creative';

const AI_IMAGE_BY_THEME: Record<AiImageTheme, string> = {
  business: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80',
  research: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=900&q=80',
  chip: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  robotics: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=900&q=80',
  safety: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
  creative: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=900&q=80',
};

const getToday = () => new Date().toLocaleDateString('ka-GE');

const normalizeTheme = (theme: unknown): AiImageTheme => {
  if (
    theme === 'business' ||
    theme === 'research' ||
    theme === 'chip' ||
    theme === 'robotics' ||
    theme === 'safety' ||
    theme === 'creative'
  ) {
    return theme;
  }

  return 'business';
};

const getFallbackAiNews = (): Article[] => [
  {
    id: 'ai-featured-anthropic-claude-2026',
    title: 'Anthropic-მა OpenAI-ს გადაასწრო: რატომ გახდა Claude AI ბაზრის ყველაზე ხმაურიანი მოთამაშე',
    summary:
      'Claude-ზე მოთხოვნის სწრაფმა ზრდამ Anthropic ხელოვნური ინტელექტის ერთ-ერთ ყველაზე ძვირად შეფასებულ კომპანიად აქცია და AI რბოლაში ახალი ძალთა ბალანსი აჩვენა.',
    content: `
      <p>ხელოვნური ინტელექტის ბაზარზე მთავარი ამბავი უკვე მხოლოდ ChatGPT აღარ არის. ბოლო დაფინანსების რაუნდის შემდეგ Anthropic-ის შეფასებამ თითქმის ტრილიონ დოლარს მიუახლოვა, რამაც კომპანია AI ინდუსტრიის ერთ-ერთ ყველაზე გავლენიან მოთამაშედ აქცია. ინვესტორებისთვის მთავარი სიგნალი Claude-ის სწრაფი გავრცელებაა: მოდელი სულ უფრო ხშირად გამოიყენება კოდირებაში, ანალიტიკაში, დოკუმენტებთან მუშაობასა და კორპორაციულ პროცესებში.</p>
      <p>Anthropic-ის ზრდა საინტერესოა არა მხოლოდ ფინანსური რიცხვებით. კომპანია ცდილობს თავი წარმოაჩინოს, როგორც უფრო ფრთხილი და უსაფრთხო AI ლაბორატორია, რომელიც მოდელების შესაძლებლობებს ეთიკურ კონტროლთან და ბიზნესისთვის სტაბილურ პროდუქტებთან აერთიანებს. სწორედ ამან გახადა Claude განსაკუთრებით მიმზიდველი მსხვილი კომპანიებისთვის, რომლებსაც სურთ AI ყოველდღიურ სამუშაოში ჩართონ, მაგრამ რისკების გარეშე.</p>
      <p>ეს ამბავი AI ბაზარზე ძალთა განლაგებასაც ცვლის. OpenAI კვლავ ყველაზე ცნობად ბრენდად რჩება, Google და Meta კი საკუთარი მოდელებით აქტიურად აწვებიან ბაზარს, თუმცა Anthropic-ის ასეთი სწრაფი ნახტომი აჩვენებს, რომ მომდევნო ეტაპი მხოლოდ უკეთეს ჩატბოტებზე აღარ იქნება. გამარჯვებული ის კომპანია გახდება, ვინც AI-ს რეალურ სამუშაო პროცესებში ყველაზე საიმედოდ ჩასვამს.</p>
    `,
    author: 'Paqtebi AI Desk',
    category: 'AI სიახლეები',
    date: getToday(),
    imageUrl: AI_IMAGE_BY_THEME.business,
    layout: 'standard',
    contentType: 'article',
  },
];

export const fetchAiFocusedNews = async (): Promise<Article[]> => {
  if (!apiKey) {
    console.warn("API Key not found, returning editorial fallback AI news.");
    return getFallbackAiNews();
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        დაწერე ზუსტად ერთი სერიოზული, მკითხველისთვის საინტერესო AI ახალი ამბის სტატია ქართულად.
        თემა უნდა იყოს მაღალი ინტერესის მქონე: OpenAI, Anthropic, Google DeepMind, Meta AI, Nvidia, AI რეგულაცია,
        AI უსაფრთხოება, მოდელების ახალი შესაძლებლობები, AI ბიზნესში ან მეცნიერებაში.

        მოთხოვნები:
        - არ დაწერო ზედაპირული ან ფანტასტიკური ტექსტი.
        - სათაური იყოს ძლიერი, მაგრამ არა ყვითელი პრესის სტილში.
        - summary იყოს 1-2 წინადადება.
        - content იყოს 3 აბზაცი HTML <p> ტეგებით.
        - თუ ზუსტი ფაქტი არ იცი, ნუ გამოიგონებ კონკრეტულ რიცხვებს ან თარიღებს.
        - imageTheme აირჩიე მხოლოდ ამ სიიდან: business, research, chip, robotics, safety, creative.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            content: { type: Type.STRING },
            author: { type: Type.STRING },
            category: { type: Type.STRING },
            imageTheme: { type: Type.STRING },
          },
          required: ["id", "title", "summary", "content", "author", "category", "imageTheme"],
        },
      },
    });

    if (!response.text) return getFallbackAiNews();

    const parsed = JSON.parse(response.text);
    const imageTheme = normalizeTheme(parsed.imageTheme);

    return [
      {
        id: parsed.id || `ai-daily-${Date.now()}`,
        title: parsed.title,
        summary: parsed.summary,
        content: parsed.content,
        author: parsed.author || 'Paqtebi AI Desk',
        category: parsed.category || 'AI სიახლეები',
        date: getToday(),
        imageUrl: AI_IMAGE_BY_THEME[imageTheme],
        layout: 'standard',
        contentType: 'article',
      } as Article,
    ];
  } catch (error) {
    console.error("Error fetching AI news, falling back to editorial article:", error);
    return getFallbackAiNews();
  }
};

export const summarizeArticle = async (text: string): Promise<string | null> => {
  if (!apiKey) {
    console.warn("API Key not found for summarization");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Please summarize the following article into 3-5 concise bullet points in the Georgian language. Focus on the most important facts and takeaways.\n\nArticle Content:\n${text}`,
    });

    return response.text || null;
  } catch (error) {
    console.error("Error summarizing article:", error);
    return null;
  }
};
