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

function yesNoPill(isYes) {
  if (isYes === true) {
    return '<span class="inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Yes</span>';
  }
  if (isYes === false) {
    return '<span class="inline-flex rounded-full border border-black/10 bg-bg-color px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">No</span>';
  }
  return '<span class="text-sm text-black/50">—</span>';
}

function formatRating(stats) {
  const avg = stats && typeof stats.avgOverall === 'number' ? stats.avgOverall : null;
  const n = stats && typeof stats.numReviews === 'number' ? stats.numReviews : null;
  if (avg === null || n === null || n === 0) return '—';
  return `${avg.toFixed(2)}(${n})`;
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
      '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-black/60">Unable to load course catalog.</td></tr>';
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
    const mappingUrl = new URL('data/mapping.json', baseDirUrl).toString();
    const statsUrl = new URL('data/course-stats.json', baseDirUrl).toString();

    const [coursesRes, specsRes, mappingRes, statsRes] = await Promise.all([
      fetch(coursesUrl),
      fetch(specializationsUrl),
      fetch(mappingUrl),
      fetch(statsUrl)
    ]);
    if (!coursesRes.ok) throw new Error(`Unable to fetch courses.json (${coursesRes.status})`);
    if (!specsRes.ok) throw new Error(`Unable to fetch specializations.json (${specsRes.status})`);
    if (!mappingRes.ok) throw new Error(`Unable to fetch mapping.json (${mappingRes.status})`);
    if (!statsRes.ok) throw new Error(`Unable to fetch course-stats.json (${statsRes.status})`);

    const [coursesData, specializationsData, mappingData, statsData] = await Promise.all([
      coursesRes.json(),
      specsRes.json(),
      mappingRes.json(),
      statsRes.json()
    ]);

    const courses = coursesData && typeof coursesData === 'object' ? Object.values(coursesData) : [];
    const courseStats = statsData && typeof statsData === 'object' ? statsData : {};

    // Build course -> specialization mapping using mapping.json and specializations.json
    const courseToSpecs = {};
    if (mappingData && typeof mappingData === 'object') {
      Object.keys(mappingData).forEach((specId) => {
        const specMeta = mappingData[specId];
        const specName = (specializationsData && specializationsData[specId] && specializationsData[specId].name) || `Spec ${specId}`;

        const addCourses = (arr) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((g) => {
            if (!g) return;
            // g may be an object with 'courses' or string entries
            if (Array.isArray(g.courses)) {
              g.courses.forEach((cid) => {
                if (typeof cid !== 'string' || !cid) return;
                if (!courseToSpecs[cid]) courseToSpecs[cid] = [];
                if (!courseToSpecs[cid].includes(specName)) courseToSpecs[cid].push(specName);
              });
            } else if (typeof g === 'string') {
              const cid = g;
              if (!courseToSpecs[cid]) courseToSpecs[cid] = [];
              if (!courseToSpecs[cid].includes(specName)) courseToSpecs[cid].push(specName);
            }
          });
        };

        if (specMeta && typeof specMeta === 'object') {
          if (Array.isArray(specMeta.core)) addCourses(specMeta.core);
          if (Array.isArray(specMeta.electives)) addCourses(specMeta.electives);
          if (Array.isArray(specMeta.electives || [])) addCourses(specMeta.electives);
        }
      });
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      if (tableBody) {
        tableBody.innerHTML =
          '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-black/60">No courses available.</td></tr>';
      }
      return;
    }

    if (courseCount) courseCount.textContent = String(courses.length);
    if (tableBody) tableBody.innerHTML = '';

    function statsForCourse(courseId) {
      if (!courseId || typeof courseId !== 'string') return null;
      const variants = [courseId, courseId.replace(/\s+/g, '-'), courseId.replace(/\s+/g, '-').replace(/\//g, '-')];
      for (const v of variants) {
        if (statsData[v]) return statsData[v];
      }
      // try uppercase-dash variant
      const up = courseId.toUpperCase().replace(/\s+/g, '-');
      return statsData[up] || null;
    }

    courses.forEach((course) => {
      if (!course || typeof course !== 'object') return;
      const courseId = course.courseId;
      if (typeof courseId !== 'string' || !courseId) return;

      const specsForCourse = courseToSpecs[courseId] || [];
      const foundational = course.isFoundational === true;
      const stats = statsForCourse(courseId);
      const rating = formatRating(stats);
      const difficulty = stats && typeof stats.avgDifficulty === 'number' ? stats.avgDifficulty.toFixed(2) : '—';
      const workload = stats && typeof stats.avgWorkload === 'number' ? `${stats.avgWorkload.toFixed(1)}` : '—';
      const language = (course.primaryLanguage && course.primaryLanguage) || '—';

      const row = document.createElement('tr');
      row.className = 'border-t border-black/10';
      row.innerHTML = `
        <td class="px-6 py-5 align-top text-sm font-semibold text-black">${courseId}</td>
        <td class="px-6 py-5 align-top text-sm text-black/90">${course.name || '—'}</td>
        <td class="px-6 py-5 align-top text-sm text-black/90">${createSpecializationPills(specsForCourse)}</td>
        <td class="px-6 py-5 align-top text-sm text-black/90">${language}</td>
        <td class="px-6 py-5 align-top text-sm font-medium text-black">${yesNoPill(foundational)}</td>
        <td class="px-6 py-5 align-top text-sm font-medium text-black">${rating}</td>
        <td class="px-6 py-5 align-top text-sm font-medium text-black">${difficulty}</td>
        <td class="px-6 py-5 align-top text-sm font-medium text-black">${workload}</td>
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

