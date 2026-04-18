import { BaseCrawler } from './crawler';
import * as cheerio from 'cheerio';

export interface Course {
    id: string;
    name: string;
    isFoundational?: boolean;
    link: string | null;
}

export class CoursesCrawler extends BaseCrawler {
    URL: string;

    constructor(url?: string) {
        super();
        this.URL = url || '';
    }

    private static parseCourseLine(rawText: string): { id: string; name: string; isFoundational: boolean } {
        const normalized = BaseCrawler.normalizeText(rawText.replace(/\u00A0/g, ' '));
        const parts = normalized.split(/:\s*/, 2);
        let id = (parts[0] || '').replace(/\*/g, '').trim();
        const isFoundational = /\*/.test(parts[0] || '');
        let name = (parts[1] || '').trim();

        if (!name && id) {
            const tokens = id.split(/\s+/);
            if (tokens.length > 2) {
                name = tokens.slice(2).join(' ');
                id = tokens.slice(0, 2).join(' ');
            }
        }

        return { id, name, isFoundational };
    }

    parseHTML(html: string): Course[] {
        const $ = cheerio.load(html);

        const selector = 'div.gt-main-content ul li';
        const courses = $(selector)
            .map((_: any, el: any) => {
                const li = $(el);
                const rawText = li.text();
                const { id, name, isFoundational } = CoursesCrawler.parseCourseLine(rawText);
                if (!id || !name) return null;

                const firstLink = li.find('a').first();
                const href = firstLink.length ? firstLink.attr('href') || null : null;

                const course: Course = { id, name, link: href };
                if (isFoundational) {
                    course.isFoundational = true;
                }

                return course;
            })
            .get()
            .filter((item: Course | null): item is Course => item !== null);

        return courses;
    }

    async fetchCurrentCourses(): Promise<Course[]> {
        return await this.crawl(this.URL) as Course[];
    }
}

export default CoursesCrawler;

