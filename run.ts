import CoursesCrawler, { Course } from './harvest/courses';
import SpecializationCrawler from './harvest/specialization';
import fs from 'fs';

async function main(): Promise<void> {
  const COURSES_URL = 'https://omscs.gatech.edu/current-courses';
  const SPECIALIZATION_URL = 'https://www.cc.gatech.edu/ms-computer-science-specializations';

  const coursesCrawler = new CoursesCrawler(COURSES_URL);
  const courses: Course[] = await coursesCrawler.fetchCurrentCourses();
  fs.writeFileSync('data/courses.json', JSON.stringify(courses, null, 2));
  console.log(`Wrote ${courses.length} courses`);

  const specializationCrawler = new SpecializationCrawler(SPECIALIZATION_URL);
  const specializations = await specializationCrawler.fetchSpecializations();
  const specializationsWithCourses = await specializationCrawler.fetchSpecializationWithCourses();
  fs.writeFileSync(
    'data/specializations.json',
    JSON.stringify({ specializations, specializationsWithCourses }, null, 2)
  );
  console.log(`Wrote ${specializations.length} specializations and ${specializationsWithCourses.length} with courses`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

