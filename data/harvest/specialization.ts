import { BaseCrawler } from './crawler';
import * as cheerio from 'cheerio';

export interface Specialization {
	id: string;
	name: string;
}

export interface SpecializationWithCourses extends Specialization {
    courses: string[];
}

export class SpecializationCrawler extends BaseCrawler {
    URL: string;

    constructor(url?: string) {
        super();
        this.URL = url || '';
    }

    cache: any | null = null;

    async fetchOnce(): Promise<any> {
        if (this.cache) return this.cache;
        const html = await this.fetch(this.URL);
        const parsed = this.parseHTML(html);
        this.cache = parsed;
        return parsed;
    }

    async fetchSpecializations(): Promise<Specialization[]> {
        const parsed = await this.fetchOnce();
        return (parsed && parsed.specializations) ? parsed.specializations as Specialization[] : [];
    }

    // Uses the same URL as the list — kept separate for clarity.
    async fetchSpecializationWithCourses(): Promise<SpecializationWithCourses[]> {
        const parsed = await this.fetchOnce();
        return (parsed && parsed.specializationWithCourses) ? parsed.specializationWithCourses as SpecializationWithCourses[] : [];
    }

    parseHTML(html: string): any {
        const $ = cheerio.load(html);

        const containerSelector = '.field.field--name-field-basic-body.field--type-text-with-summary.field--label-hidden.field__item';
        const container = $(containerSelector);
        const h4s = container.find('h4');

        const specializations: Specialization[] = [];
        const specializationWithCourses: SpecializationWithCourses[] = [];

        h4s.each((i, el) => {
            const name = $(el).text().trim();
            const id = String(i + 1);

            // Collect all siblings after this h4 until the next h4
            let currentEl = $(el).next();
            const elementsBefore = [];
            while (currentEl.length) {
                if (currentEl.is('h4')) break;
                elementsBefore.push(currentEl);
                currentEl = currentEl.next();
            }

            // Parse core and electives from the collected elements
            const courses: { [key: string]: string[] } = { core: [], electives: [] };
            let currentSection: 'core' | 'electives' | null = null;

            elementsBefore.forEach(elem => {
                const text = $(elem).text();
                // Check for Core section header
                if ($(elem).find('strong').length > 0 && text.includes('Core')) {
                    currentSection = 'core';
                }
                // Check for Electives section header
                else if ($(elem).find('strong').length > 0 && text.includes('Electives')) {
                    currentSection = 'electives';
                }
                // Collect li items from ul blocks in current section
                else if ($(elem).is('ul') && currentSection) {
                    $(elem).find('li').each((_, li) => {
                        const courseText = $(li).text().trim();
                        if (courseText) {
                            const courseID = courseText.split(/\s+/).slice(0, 2).join(' ');
                            courses[currentSection!].push(courseID);
                        }
                    });
                }
            });

            const flattenedCourses = [...courses.core, ...courses.electives];
            specializations.push({ id, name });
            specializationWithCourses.push({ id, name, courses: flattenedCourses });
        });

        return { specializations, specializationWithCourses };
    }
}

export default SpecializationCrawler;
