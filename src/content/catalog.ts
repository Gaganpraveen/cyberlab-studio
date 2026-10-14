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
const domainById = new Map(DOMAINS.map((d) => [d.id, d]));

export function getTopic(id: string): TopicRecord | undefined {
  return topicById.get(id.toUpperCase());
}

export function getDomain(id: string): DomainRecord | undefined {
  return domainById.get(id.toUpperCase());
}

/** Lowercase, URL-friendly form of a topic id: "WEB-01" -> "web-01". */
export function topicSlug(id: string): string {
  return id.toLowerCase();
}
