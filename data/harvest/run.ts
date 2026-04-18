import { url } from 'inspector';
import CoursesCrawler, { Course } from './courses';
import SpecializationCrawler from './specialization';
import fs from 'fs';

async function main(): Promise<void> {
  const COURSES_URL = 'https://omscs.gatech.edu/current-courses';
  const SPECIALIZATION_URL = 'https://www.cc.gatech.edu/ms-computer-science-specializations';

  // Courses
  const coursesCrawler = new CoursesCrawler(COURSES_URL);
  const courses: Course[] = await coursesCrawler.fetchCurrentCourses();
  fs.writeFileSync('data/courses.json', JSON.stringify(courses, null, 2));
  console.log(`Wrote ${courses.length} courses`);

  // Specializations
  const specializationCrawler = new SpecializationCrawler(SPECIALIZATION_URL);
  const specializations = await specializationCrawler.fetchSpecializations();
  const specializationsWithCourses = await specializationCrawler.fetchSpecializationWithCourses();
  const specializationsData = {
    specializations,
    specializationsWithCourses
  };
  fs.writeFileSync('data/specializations.json', JSON.stringify(specializationsData, null, 2));
  console.log(`Wrote ${specializations.length} specializations and ${specializationsWithCourses.length} with courses`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
