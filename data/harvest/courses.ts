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

    parseHTML(html: string): Course[] {
        const $ = cheerio.load(html);

        const selector = 'div.gt-main-content ul li';
        const courses = $(selector)
            .map((_: any, el: any) => {
                const li = $(el);
                const rawText = li.text().trim();

                const parts = rawText.split(':', 2);
                let id = (parts[0] || '').trim();
                const name = (parts[1] || '').trim();

                const isFoundational = id.includes('*');
                if (isFoundational) {
                    id = id.replace('*', '').trim();
                }

                const firstLink = li.find('a').first();
                const href = firstLink.length ? firstLink.attr('href') || null : null;

                const course: Course = { id, name, link: href };
                if (isFoundational) {
                    course.isFoundational = true;
                }

                return course;
            })
            .get();

        return courses;
    }

    async fetchCurrentCourses(): Promise<Course[]> {
        return await this.crawl(this.URL) as Course[];
    }

}

export default CoursesCrawler;

