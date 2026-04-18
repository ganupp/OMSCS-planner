const courseCount = document.getElementById('course-count');
const tableBody = document.getElementById('courses-table-body');
const errorElement = document.getElementById('courses-error');

function createSpecializationPills(specs) {
  if (!specs || specs.length === 0) {
    return '<span class="text-sm text-black/50">—</span>';
  }
  return specs
    .map(
      (name) => `
        <span class="mr-2 mb-2 inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">${name}</span>
      `
    )
    .join('');
}

function courseIdFromLine(line) {
  if (typeof line !== 'string') return '';
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).join(' ');
}

function normalizeBaseForData(baseUri) {
  const url = new URL(baseUri);
  url.search = '';
  url.hash = '';

  // If we're at ".../index.html" treat it as a file and resolve relative to its folder.
  if (url.pathname.endsWith('.html')) {
    url.pathname = url.pathname.replace(/[^/]*$/, '');
    return url;
  }

  // If we're at ".../repo" (no trailing slash), treat it as a directory (GitHub Pages).
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }

  return url;
}

function showError(message, details) {
  if (errorElement) {
    errorElement.textContent = details ? `${message} (${details})` : message;
    errorElement.classList.remove('hidden');
  }
  if (tableBody) {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="px-6 py-12 text-center text-sm text-black/60">Unable to load course catalog.</td></tr>';
  }
}

(async function main() {
  try {
    // A very common cause of "TypeError: Failed to fetch" is opening the page via file://.
    if (window.location.protocol === 'file:') {
      showError('Error loading data: page must be served over http(s)', 'opened via file://');
      return;
    }

    const baseDirUrl = normalizeBaseForData(document.baseURI || window.location.href);
    const coursesUrl = new URL('data/courses.json', baseDirUrl).toString();
    const specializationsUrl = new URL('data/specializations.json', baseDirUrl).toString();

    const [coursesRes, specsRes] = await Promise.all([fetch(coursesUrl), fetch(specializationsUrl)]);
    if (!coursesRes.ok) throw new Error(`Unable to fetch courses.json (${coursesRes.status})`);
    if (!specsRes.ok) throw new Error(`Unable to fetch specializations.json (${specsRes.status})`);

    const [courses, specializationsData] = await Promise.all([coursesRes.json(), specsRes.json()]);

    const courseToSpecs = {};
    const specs = (specializationsData && specializationsData.specializationsWithCourses) || [];
    specs.forEach((spec) => {
      const courseLines = Array.isArray(spec.courses)
        ? spec.courses
        : [...((spec.courses && spec.courses.core) || []), ...((spec.courses && spec.courses.electives) || [])];

      courseLines.forEach((line) => {
        const courseId = courseIdFromLine(line);
        if (!courseId) return;
        if (!courseToSpecs[courseId]) courseToSpecs[courseId] = [];
        if (!courseToSpecs[courseId].includes(spec.name)) {
          courseToSpecs[courseId].push(spec.name);
        }
      });
    });

    if (!Array.isArray(courses) || courses.length === 0) {
      if (tableBody) {
        tableBody.innerHTML =
          '<tr><td colspan="4" class="px-6 py-12 text-center text-sm text-black/60">No courses available.</td></tr>';
      }
      return;
    }

    if (courseCount) courseCount.textContent = String(courses.length);
    if (tableBody) tableBody.innerHTML = '';

    courses.forEach((course) => {
      const specsForCourse = courseToSpecs[course.id] || [];
      const row = document.createElement('tr');
      row.className = 'border-t border-black/10';
      row.innerHTML = `
        <td class="px-6 py-5 align-top text-sm font-semibold text-black">${course.id}</td>
        <td class="px-6 py-5 align-top text-sm text-black/90">${course.name}</td>
        <td class="px-6 py-5 align-top text-sm text-black/90">${createSpecializationPills(specsForCourse)}</td>
        <td class="px-6 py-5 align-top text-sm font-medium text-black">${course.isFoundational ? 'Yes' : 'No'}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading courses:', error);
    const message = error instanceof Error ? error.message : String(error);

    // Include the current page URL to make diagnosing GH Pages path issues trivial.
    showError(`Error loading data: ${message}`, `page=${window.location.href}`);
  }
})();

