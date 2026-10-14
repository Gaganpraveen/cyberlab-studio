import { DOMAINS, type DomainRecord } from './catalogData';

export type { DomainRecord };
export { DOMAINS };

export interface TopicRecord {
  id: string;
  title: string;
  activity: string;
  domainId: string;
  domainTitle: string;
  /** 1-based position inside the domain. */
  index: number;
}

export const TOPICS: TopicRecord[] = DOMAINS.flatMap((domain) =>
  domain.topics.map((topic, i) => ({
    ...topic,
    domainId: domain.id,
    domainTitle: domain.title,
    index: i + 1,
  })),
);

const topicById = new Map(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string): TopicRecord | undefined {
  return topicById.get(id.toUpperCase());
}
