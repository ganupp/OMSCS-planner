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

    private static normalizeCourseId(rawText: string): string {
        const cleaned = BaseCrawler.normalizeText(rawText.replace(/\*/g, ''));
        const tokens = cleaned.split(/\s+/);

        if (tokens.length >= 3 && /^\d+$/.test(tokens[1]) && /^[A-Z0-9]+$/.test(tokens[2])) {
            return tokens.slice(0, 3).join(' ');
        }

        return tokens.slice(0, 2).join(' ');
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
            const name = BaseCrawler.normalizeText($(el).text());
            const id = String(i + 1);

            let currentEl = $(el).next();
            const elementsBefore: cheerio.Cheerio[] = [];
            while (currentEl.length) {
                if (currentEl.is('h4')) break;
                elementsBefore.push(currentEl);
                currentEl = currentEl.next();
            }

            const courses: { [key: string]: string[] } = { core: [], electives: [] };
            let currentSection: 'core' | 'electives' | null = null;

            elementsBefore.forEach(elem => {
                const text = BaseCrawler.normalizeText($(elem).text());

                if ($(elem).find('strong').length > 0 && text.toLowerCase().includes('core')) {
                    currentSection = 'core';
                } else if ($(elem).find('strong').length > 0 && text.toLowerCase().includes('elective')) {
                    currentSection = 'electives';
                } else if ($(elem).is('ul') && currentSection) {
                    $(elem).find('li').each((_, li) => {
                        const courseText = BaseCrawler.normalizeText($(li).text());
                        if (!courseText) return;

                        const courseID = SpecializationCrawler.normalizeCourseId(courseText);
                        if (courseID) {
                            courses[currentSection!].push(courseID);
                        }
                    });
                }
            });

            const flattenedCourses = [...courses.core, ...courses.electives].filter(Boolean);
            specializations.push({ id, name });
            specializationWithCourses.push({ id, name, courses: flattenedCourses });
        });

        return { specializations, specializationWithCourses };
    }
}

export default SpecializationCrawler;

