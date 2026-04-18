import SpecializationCrawler from './harvest/specialization';
import fs from 'fs';

interface Course {
  id: string;
  name: string;
  link: string | null;
  isFoundational?: boolean;
}

async function main(): Promise<void> {
  const SPECIALIZATION_URL = 'https://www.cc.gatech.edu/ms-computer-science-specializations';

  const specializationCrawler = new SpecializationCrawler(SPECIALIZATION_URL);
  const specializations = await specializationCrawler.fetchSpecializations();
  const specializationsWithCourses = await specializationCrawler.fetchSpecializationWithCourses();

  // Derive the course list from the specializations page itself.
  const uniqueCourseLines = Array.from(
    new Set(
      specializationsWithCourses
        .flatMap(spec => [...(spec.courses?.core || []), ...(spec.courses?.electives || [])])
        .map(line => (typeof line === 'string' ? line.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const parseCourseLine = (line: string): Pick<Course, 'id' | 'name'> => {
    const tokens = line.split(/\s+/).filter(Boolean);
    const id = tokens.slice(0, 2).join(' ');
    const name = tokens.slice(2).join(' ') || id;
    return { id, name };
  };

  const courseMap = new Map<string, Course>();
  uniqueCourseLines.forEach(line => {
    const { id, name } = parseCourseLine(line);
    if (!id) return;

    const existing = courseMap.get(id);
    if (!existing || (existing.name === existing.id && name !== id)) {
      courseMap.set(id, { id, name, link: null });
    }
  });

  const courses: Course[] = Array.from(courseMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );

  fs.writeFileSync('data/courses.json', JSON.stringify(courses, null, 2));
  console.log(`Wrote ${courses.length} courses (derived from specializations)`);

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

