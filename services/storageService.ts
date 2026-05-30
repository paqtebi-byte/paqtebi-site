import { AdPlacement, Article, BreakingNewsItem, Poll } from "../types";

const STORAGE_KEY_ARTICLES = 'paqtebi_articles';
const STORAGE_KEY_BREAKING_NEWS = 'paqtebi_breaking_news';
const STORAGE_KEY_POLLS = 'paqtebi_polls';
const STORAGE_KEY_ACTIVE_POLL = 'paqtebi_active_poll';
const STORAGE_KEY_AD_PLACEMENT = 'paqtebi_ad_placement';

// --- Articles (CMS) ---

export const getLocalArticles = (): Article[] => {
  const data = localStorage.getItem(STORAGE_KEY_ARTICLES);
  return data ? JSON.parse(data) : [];
};

export const saveLocalArticle = (article: Article): void => {
  const articles = getLocalArticles();
  const index = articles.findIndex(a => a.id === article.id);
  
  // Ensure layout has a default
  if (!article.layout) article.layout = 'standard';

  if (index >= 0) {
    articles[index] = article;
  } else {
    articles.unshift(article);
  }
  
  localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
};

export const deleteLocalArticle = (id: string): void => {
  const articles = getLocalArticles().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
};

// --- Breaking News ---

export const getBreakingNewsData = (): BreakingNewsItem[] => {
  const data = localStorage.getItem(STORAGE_KEY_BREAKING_NEWS);
  if (data) {
    return JSON.parse(data);
  }
  // Default data if empty
  const defaults = [
    { id: '1', text: 'მსოფლიო ბანკი საქართველოს ეკონომიკურ ზრდას პროგნოზირებს', active: true },
    { id: '2', text: 'ლაზარე-ITV იწყებს ახალ საგამოძიებო სეზონს', active: true },
    { id: '3', text: 'ამინდის პროგნოზი: მოსალოდნელია ტემპერატურის მატება', active: true }
  ];
  localStorage.setItem(STORAGE_KEY_BREAKING_NEWS, JSON.stringify(defaults));
  return defaults;
};

export const addBreakingNewsItem = (text: string): void => {
  const items = getBreakingNewsData();
  const newItem: BreakingNewsItem = {
    id: Date.now().toString(),
    text,
    active: true
  };
  items.unshift(newItem);
  localStorage.setItem(STORAGE_KEY_BREAKING_NEWS, JSON.stringify(items));
};

export const deleteBreakingNewsItem = (id: string): void => {
  const items = getBreakingNewsData().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY_BREAKING_NEWS, JSON.stringify(items));
};

// --- Polls ---

export const getPolls = (): Poll[] => {
  const data = localStorage.getItem(STORAGE_KEY_POLLS);
  return data ? JSON.parse(data) : [];
};

export const getActivePoll = (): Poll | null => {
  const activePollId = localStorage.getItem(STORAGE_KEY_ACTIVE_POLL);
  if (!activePollId) return null;
  
  const polls = getPolls();
  return polls.find(p => p.id === activePollId) || null;
};

export const savePoll = (poll: Poll): void => {
  const polls = getPolls();
  const index = polls.findIndex(p => p.id === poll.id);
  
  if (index >= 0) {
    polls[index] = poll;
  } else {
    polls.unshift(poll);
  }
  
  localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  
  // If this poll is active, update active poll
  if (poll.active) {
    // Deactivate other polls
    polls.forEach(p => {
      if (p.id !== poll.id) {
        p.active = false;
      }
    });
    localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
    localStorage.setItem(STORAGE_KEY_ACTIVE_POLL, poll.id);
  }
};

export const deletePoll = (id: string): void => {
  const polls = getPolls().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  
  // If deleted poll was active, clear active poll
  const activePollId = localStorage.getItem(STORAGE_KEY_ACTIVE_POLL);
  if (activePollId === id) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_POLL);
  }
};

export const setActivePoll = (pollId: string): void => {
  const polls = getPolls();
  polls.forEach(p => {
    p.active = p.id === pollId;
  });
  localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  localStorage.setItem(STORAGE_KEY_ACTIVE_POLL, pollId);
};

export const updatePollVotes = (pollId: string, optionId: string): void => {
  const polls = getPolls();
  const poll = polls.find(p => p.id === pollId);
  
  if (poll) {
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
      option.votes += 1;
      poll.totalVotes += 1;
      localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
    }
  }
};

// --- Sidebar Ad Placement ---

export const getAdPlacement = (): AdPlacement => {
  const data = localStorage.getItem(STORAGE_KEY_AD_PLACEMENT);
  if (data) {
    return JSON.parse(data);
  }

  return {
    title: '',
    imageUrl: '',
    targetUrl: '',
    active: false,
  };
};

export const saveAdPlacement = (ad: AdPlacement): void => {
  localStorage.setItem(
    STORAGE_KEY_AD_PLACEMENT,
    JSON.stringify({
      ...ad,
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const clearAdPlacement = (): void => {
  localStorage.removeItem(STORAGE_KEY_AD_PLACEMENT);
};
