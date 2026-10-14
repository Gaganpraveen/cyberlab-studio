import { DOMAINS, TOPICS } from '@/content/catalog';
import { hasLesson } from '@/content/lessons';
import { labsForTopic } from '@/labs/registry';

export interface TopicStatus {
  hasLesson: boolean;
  hasLab: boolean;
}

export function topicStatus(topicId: string): TopicStatus {
  return { hasLesson: hasLesson(topicId), hasLab: labsForTopic(topicId).length > 0 };
}

export interface DomainStats {
  total: number;
  ready: number;
}

export function domainStats(domainId: string): DomainStats {
  const topics = TOPICS.filter((t) => t.domainId === domainId);
  return {
    total: topics.length,
    ready: topics.filter((t) => hasLesson(t.id)).length,
  };
}

export const CATALOG_SUMMARY = {
  domains: DOMAINS.length,
  topics: TOPICS.length,
  lessons: TOPICS.filter((t) => hasLesson(t.id)).length,
};
