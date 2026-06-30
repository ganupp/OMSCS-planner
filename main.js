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

function createCoursePills(courses) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return '<span class="text-sm text-black/50">—</span>';
  }
  return courses
    .map((courseId) => `
      <span class="mr-2 mb-2 inline-flex rounded-full border border-black/10 bg-bg-color px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">${courseId}</span>
    `)
    .join('');
}

function getAssignedCourseIds(semesters) {
  return semesters.flatMap((semester) => semester.courses);
}

function isCourseAssigned(semesters, courseId) {
  return getAssignedCourseIds(semesters).includes(courseId);
}

function totalAssignedCourses(semesters) {
  return getAssignedCourseIds(semesters).length;
}

function countFoundationalInFirstTwo(semesters, coursesMap) {
  const firstTwo = semesters.slice(0, 2);
  return firstTwo.reduce((count, semester) => {
    return (
      count +
      semester.courses.reduce((inner, courseId) => {
        const course = coursesMap[courseId];
        return inner + (course && course.isFoundational === true ? 1 : 0);
      }, 0)
    );
  }, 0);
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

function normalizeText(value) {
  return (typeof value === 'string' ? value.trim().toLowerCase() : '');
}

function sortCourses(courses, field, direction) {
  return courses.slice().sort((a, b) => {
    let left;
    let right;

    if (field === 'specializations') {
      left = (courseToSpecs[a.courseId] || []).join(', ');
      right = (courseToSpecs[b.courseId] || []).join(', ');
    } else if (field === 'language') {
      left = a.primaryLanguage || '';
      right = b.primaryLanguage || '';
    } else if (field === 'name') {
      left = a.name || '';
      right = b.name || '';
    } else {
      left = a.courseId || '';
      right = b.courseId || '';
    }

    left = normalizeText(left);
    right = normalizeText(right);

    if (left < right) return direction === 'asc' ? -1 : 1;
    if (left > right) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

function groupUniqueValues(courses, accessor) {
  const values = new Set();
  courses.forEach((course) => {
    const value = accessor(course);
    if (typeof value === 'string' && value.trim()) {
      values.add(value.trim());
    }
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function renderSpecializationSummary(mappingData, specializationsData) {
  const container = document.getElementById('specialization-summary');
  if (!container) return;
  const cards = Object.keys(mappingData)
    .sort((a, b) => {
      const nameA = (specializationsData[a] && specializationsData[a].name) || a;
      const nameB = (specializationsData[b] && specializationsData[b].name) || b;
      return nameA.localeCompare(nameB);
    })
    .map((specId) => {
      const specMeta = mappingData[specId] || {};
      const specName = (specializationsData[specId] && specializationsData[specId].name) || `Specialization ${specId}`;
      const coreGroups = Array.isArray(specMeta.core) ? specMeta.core : [];
      const electiveGroups = Array.isArray(specMeta.electives) ? specMeta.electives : [];
      const requiredCoreCount = coreGroups.reduce((sum, group) => {
        const count = parseInt(group.count, 10);
        return sum + (Number.isFinite(count) ? count : 0);
      }, 0);
      const requiredElectives = Number.isFinite(parseInt(specMeta.electives_count, 10)) ? parseInt(specMeta.electives_count, 10) : 0;

      return `
        <section class="rounded-[28px] border border-black/10 bg-bg-color p-6">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 class="text-xl font-semibold text-black">${specName}</h4>
              <p class="mt-2 text-sm text-black/70">Core required: ${requiredCoreCount} · Electives required: ${requiredElectives}</p>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Core</div>
              ${coreGroups
                .map((group) => {
                  const count = Number.isFinite(parseInt(group.count, 10)) ? parseInt(group.count, 10) : '-';
                  return `
                    <div class="mb-3 rounded-3xl border border-black/10 bg-white p-4">
                      <div class="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-black">
                        <span>${group.name || 'Core group'}</span>
                        <span class="text-black/60">Take ${count}</span>
                      </div>
                      <div class="flex flex-wrap">${createCoursePills(group.courses || [])}</div>
                    </div>
                  `;
                })
                .join('')}
            </div>
            <div>
              <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Electives</div>
              <p class="mb-3 text-sm text-black/70">Choose ${requiredElectives} electives from these groups.</p>
              ${electiveGroups
                .map((group) => `
                  <div class="mb-3 rounded-3xl border border-black/10 bg-white p-4">
                    <div class="mb-2 text-sm font-semibold text-black">${group.name || 'Elective group'}</div>
                    <div class="flex flex-wrap">${createCoursePills(group.courses || [])}</div>
                  </div>
                `)
                .join('')}
            </div>
          </div>
        </section>
      `;
    })
    .join('');

  container.innerHTML = cards;
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

    const [coursesRes, specsRes, mappingRes] = await Promise.all([
      fetch(coursesUrl),
      fetch(specializationsUrl),
      fetch(mappingUrl)
    ]);
    if (!coursesRes.ok) throw new Error(`Unable to fetch courses.json (${coursesRes.status})`);
    if (!specsRes.ok) throw new Error(`Unable to fetch specializations.json (${specsRes.status})`);
    if (!mappingRes.ok) throw new Error(`Unable to fetch mapping.json (${mappingRes.status})`);

    const [coursesData, specializationsData, mappingData] = await Promise.all([
      coursesRes.json(),
      specsRes.json(),
      mappingRes.json()
    ]);

    const courses = coursesData && typeof coursesData === 'object' ? Object.values(coursesData) : [];

    const filters = {
      search: '',
      specialization: '',
      language: '',
      foundational: '',
      sortField: 'courseId',
      sortDirection: 'asc'
    };

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

    const specializationChoices = Array.from(
      new Set(Object.values(courseToSpecs).flat())
    ).sort((a, b) => a.localeCompare(b));
    const languageChoices = groupUniqueValues(courses, (course) => course.primaryLanguage || '');

    const searchInput = document.getElementById('course-search');
    const specializationFilter = document.getElementById('specialization-filter');
    const languageFilter = document.getElementById('language-filter');
    const foundationalFilter = document.getElementById('foundational-filter');
    const sortFieldSelect = document.getElementById('sort-field');
    const sortDirectionBtn = document.getElementById('sort-direction');

    function buildSelectOptions(items, selectEl, placeholder) {
      if (!selectEl) return;
      selectEl.innerHTML =
        `<option value="">${placeholder}</option>` +
        items.map((item) => `<option value="${item}">${item}</option>`).join('');
    }

    buildSelectOptions(specializationChoices, specializationFilter, 'All specializations');
    buildSelectOptions(languageChoices, languageFilter, 'All languages');
    renderSpecializationSummary(mappingData, specializationsData);

    const planner = {
      semesters: [
        { id: 1, name: 'Semester 1', courses: [] },
        { id: 2, name: 'Semester 2', courses: [] }
      ],
      selectedSemesterId: 1
    };
    const plannerCount = document.getElementById('planner-count');
    const plannerWarning = document.getElementById('planner-warning');
    const plannerAchieved = document.getElementById('planner-achieved');
    const plannerProgress = document.getElementById('planner-progress');
    const semesterList = document.getElementById('semester-list');
    const addSemesterButton = document.getElementById('add-semester-btn');

    function getCourseById(courseId) {
      return courses.find((course) => course.courseId === courseId);
    }

    function getSelectedSemester() {
      return planner.semesters.find((semester) => semester.id === planner.selectedSemesterId);
    }

    function getSelectedCourseIds() {
      return getAssignedCourseIds(planner.semesters);
    }

    function getSpecializationProgresses() {
      const selectedIds = new Set(getSelectedCourseIds());
      return Object.keys(mappingData).map((specId) => {
        const specMeta = mappingData[specId] || {};
        const specName = (specializationsData[specId] && specializationsData[specId].name) || `Specialization ${specId}`;
        const coreGroups = Array.isArray(specMeta.core) ? specMeta.core : [];
        const electiveGroups = Array.isArray(specMeta.electives) ? specMeta.electives : [];
        const requiredCoreCount = coreGroups.reduce((sum, group) => {
          const requiredCount = parseInt(group.count, 10);
          return sum + (Number.isFinite(requiredCount) ? requiredCount : 0);
        }, 0);
        const requiredElectives = Number.isFinite(parseInt(specMeta.electives_count, 10)) ? parseInt(specMeta.electives_count, 10) : 0;

        const coreGroupStatus = coreGroups.map((group) => {
          const groupCount = Number.isFinite(parseInt(group.count, 10)) ? parseInt(group.count, 10) : 0;
          const selectedCount = Array.isArray(group.courses)
            ? group.courses.filter((courseId) => selectedIds.has(courseId)).length
            : 0;
          return {
            name: group.name || 'Core group',
            required: groupCount,
            selected: selectedCount,
            satisfied: groupCount === 0 || selectedCount >= groupCount
          };
        });

        const selectedElectiveIds = new Set(
          electiveGroups.flatMap((group) => (Array.isArray(group.courses) ? group.courses.filter((courseId) => selectedIds.has(courseId)) : []))
        );
        const selectedElectivesCount = selectedElectiveIds.size;
        const electivesSatisfied = requiredElectives === 0 || selectedElectivesCount >= requiredElectives;

        return {
          specId,
          specName,
          coreGroupStatus,
          requiredCoreCount,
          selectedCoreCount: coreGroupStatus.reduce((sum, item) => sum + item.selected, 0),
          requiredElectives,
          selectedElectivesCount,
          electivesSatisfied,
          achieved: coreGroupStatus.every((group) => group.satisfied) && electivesSatisfied,
          advises: coreGroupStatus.map((group) => {
            if (group.satisfied) return `${group.name} done`;
            return `${group.selected} / ${group.required} from ${group.name}`;
          })
        };
      });
    }

    function renderPlannerSummary() {
      if (plannerAchieved) {
        const achieved = getSpecializationProgresses().filter((spec) => spec.achieved);
        plannerAchieved.innerHTML = achieved.length
          ? `<p class="text-sm font-semibold text-black">${achieved.length} specialization${achieved.length === 1 ? '' : 's'} achieved:</p><div class="mt-3 flex flex-wrap gap-2">${achieved
              .map((spec) => `<span class="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">${spec.specName}</span>`)
              .join('')}</div>`
          : '<p class="text-sm text-black/90">No specialization fully completed yet. Keep adding courses to meet the requirements.</p>';
      }

      if (plannerProgress) {
        const progress = getSpecializationProgresses().filter((spec) => spec.selectedCoreCount > 0 || spec.selectedElectivesCount > 0);
        plannerProgress.innerHTML = progress.length
          ? progress
              .map((spec) => `
                <div class="mb-3 rounded-3xl border border-black/10 bg-white p-4">
                  <div class="mb-2 text-sm font-semibold text-black">${spec.specName}</div>
                  <div class="text-xs uppercase tracking-[0.18em] text-black/60">Core progress</div>
                  <div class="mt-1 text-sm text-black/80">${spec.selectedCoreCount} / ${spec.requiredCoreCount}</div>
                  <div class="mt-3 text-xs uppercase tracking-[0.18em] text-black/60">Elective progress</div>
                  <div class="mt-1 text-sm text-black/80">${spec.selectedElectivesCount} / ${spec.requiredElectives}</div>
                  <div class="mt-3 text-xs text-black/60">${spec.electivesSatisfied ? 'Elective requirement met' : 'Electives still needed'}</div>
                </div>
              `)
              .join('')
          : '<p class="text-sm text-black/90">No selected courses matching specialization requirements yet.</p>';
      }
    }

    function renderSemesterPlanner() {
      if (!semesterList) return;
      semesterList.innerHTML = planner.semesters
        .map((semester) => {
          const isSelected = semester.id === planner.selectedSemesterId;
          const foundationalCount = semester.courses.reduce((count, courseId) => {
            const course = getCourseById(courseId);
            return count + (course && course.isFoundational ? 1 : 0);
          }, 0);
          return `
            <section class="rounded-[28px] border ${isSelected ? 'border-accent bg-accent/5' : 'border-black/10 bg-bg-color'} p-6">
              <div class="mb-3 flex items-center justify-between gap-3">
                <button type="button" data-semester-id="${semester.id}" class="semester-select inline-flex items-center gap-2 text-left text-xl font-semibold text-black">
                  ${semester.name}
                  <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black/70">${semester.courses.length} courses</span>
                </button>
                <div class="text-xs text-black/60">Foundational: ${foundationalCount}</div>
              </div>
              <div class="mb-4 flex flex-wrap gap-2">${createCoursePills(semester.courses)}</div>
              <div class="flex flex-wrap gap-2">
                ${semester.courses
                  .map((courseId) => `
                    <button type="button" data-remove-semester-id="${semester.id}" data-course-id="${courseId}" class="remove-course inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black transition hover:bg-black/5">
                      Remove ${courseId}
                    </button>
                  `)
                  .join('')}
              </div>
            </section>
          `;
        })
        .join('');

      updatePlannerStatus();
      renderPlannerSummary();
      attachSemesterEvents();
    }

    function updatePlannerStatus() {
      const assigned = totalAssignedCourses(planner.semesters);
      if (plannerCount) plannerCount.textContent = `Assigned courses: ${assigned} / 10`;
      const foundationalCount = countFoundationalInFirstTwo(planner.semesters, coursesData);
      if (plannerWarning) {
        if (assigned > 10) {
          plannerWarning.textContent = 'Maximum 10 courses may be assigned across all semesters.';
        } else if (planner.semesters.length >= 2 && foundationalCount < 2) {
          plannerWarning.textContent = 'At least 2 foundational courses are required in the first two semesters.';
        } else {
          plannerWarning.textContent = '';
        }
      }
    }

    function attachSemesterEvents() {
      document.querySelectorAll('[data-semester-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const semesterId = Number(button.getAttribute('data-semester-id'));
          planner.selectedSemesterId = semesterId;
          renderSemesterPlanner();
          updateTable();
        });
      });
      document.querySelectorAll('[data-remove-semester-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const semesterId = Number(button.getAttribute('data-remove-semester-id'));
          const courseId = button.getAttribute('data-course-id');
          const semester = planner.semesters.find((sem) => sem.id === semesterId);
          if (!semester) return;
          semester.courses = semester.courses.filter((id) => id !== courseId);
          renderSemesterPlanner();
          updateTable();
        });
      });
    }

    function canAddCourse(courseId) {
      if (!courseId || isCourseAssigned(planner.semesters, courseId)) return false;
      return totalAssignedCourses(planner.semesters) < 10;
    }

    function addCourseToSelectedSemester(courseId) {
      const semester = getSelectedSemester();
      if (!semester || !canAddCourse(courseId)) return;
      semester.courses.push(courseId);
      renderSemesterPlanner();
      updateTable();
    }

    function addSemester() {
      const nextId = planner.semesters.length > 0 ? Math.max(...planner.semesters.map((s) => s.id)) + 1 : 1;
      planner.semesters.push({ id: nextId, name: `Semester ${planner.semesters.length + 1}`, courses: [] });
      planner.selectedSemesterId = nextId;
      renderSemesterPlanner();
    }

    if (addSemesterButton) {
      addSemesterButton.addEventListener('click', () => {
        addSemester();
      });
    }

    renderSemesterPlanner();

    function getSpecializationsForCourse(courseId) {
      return courseToSpecs[courseId] || [];
    }

    function filterCourses() {
      const search = normalizeText(filters.search);
      const specialization = filters.specialization;
      const language = filters.language;
      const foundational = filters.foundational;

      return courses.filter((course) => {
        if (!course || typeof course !== 'object') return false;
        const courseId = course.courseId || '';
        const title = course.name || '';
        const languageValue = course.primaryLanguage || '';
        const specs = getSpecializationsForCourse(courseId);
        const foundationalValue = course.isFoundational === true;

        if (search) {
          const haystack = `${courseId} ${title} ${languageValue} ${specs.join(' ')}`;
          if (!normalizeText(haystack).includes(search)) return false;
        }

        if (specialization && !specs.includes(specialization)) return false;
        if (language && languageValue !== language) return false;
        if (foundational === 'yes' && !foundationalValue) return false;
        if (foundational === 'no' && foundationalValue) return false;

        return true;
      });
    }

    function renderTable(filteredCourses) {
      if (courseCount) courseCount.textContent = String(filteredCourses.length);
      if (!tableBody) return;
      tableBody.innerHTML = '';

      if (filteredCourses.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-black/60">No courses match those filters.</td></tr>';
        return;
      }

      filteredCourses.forEach((course) => {
        const courseId = course.courseId || '';
        const specsForCourse = getSpecializationsForCourse(courseId);
        const foundational = course.isFoundational === true;
        const language = course.primaryLanguage || '—';
        const assigned = isCourseAssigned(planner.semesters, courseId);
        const activeSemester = getSelectedSemester();
        const assignedInSelected = activeSemester && activeSemester.courses.includes(courseId);
        const canAdd = !assigned && totalAssignedCourses(planner.semesters) < 10;
        const actionButton = assignedInSelected
          ? '<span class="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">Added</span>'
          : assigned
          ? '<span class="inline-flex rounded-full border border-black/10 bg-bg-color px-3 py-1 text-xs font-semibold text-black">Assigned</span>'
          : `<button type="button" data-add-course="${courseId}" class="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-black/5" ${canAdd ? '' : 'disabled'}>${canAdd ? 'Add' : 'Limit'}</button>`;

        const courseLink = course.url
          ? `<a href="${course.url}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${courseId}</a>`
          : courseId;
        const row = document.createElement('tr');
        row.className = 'border-t border-black/10';
        row.innerHTML = `
          <td class="px-6 py-5 align-top text-sm font-semibold text-black">${courseLink}</td>
          <td class="px-6 py-5 align-top text-sm text-black/90">${course.name || '—'}</td>
          <td class="px-6 py-5 align-top text-sm text-black/90">${createSpecializationPills(specsForCourse)}</td>
          <td class="px-6 py-5 align-top text-sm text-black/90">${language}</td>
          <td class="px-6 py-5 align-top text-sm font-medium text-black">${yesNoPill(foundational)}</td>
          <td class="px-6 py-5 align-top text-sm">${actionButton}</td>
        `;
        tableBody.appendChild(row);

        const addButton = row.querySelector('[data-add-course]');
        if (addButton) {
          addButton.addEventListener('click', () => {
            addCourseToSelectedSemester(courseId);
          });
        }
      });
    }

    function updateTable() {
      const filteredCourses = filterCourses();
      const sortedCourses = sortCourses(
        filteredCourses,
        filters.sortField,
        filters.sortDirection
      );
      renderTable(sortedCourses);
    }

    const updateFilters = () => {
      filters.search = searchInput ? searchInput.value : '';
      filters.specialization = specializationFilter ? specializationFilter.value : '';
      filters.language = languageFilter ? languageFilter.value : '';
      filters.foundational = foundationalFilter ? foundationalFilter.value : '';
      filters.sortField = sortFieldSelect ? sortFieldSelect.value : 'courseId';
    };

    if (searchInput) searchInput.addEventListener('input', () => {
      filters.search = searchInput.value;
      updateTable();
    });
    if (specializationFilter) specializationFilter.addEventListener('change', () => {
      filters.specialization = specializationFilter.value;
      updateTable();
    });
    if (languageFilter) languageFilter.addEventListener('change', () => {
      filters.language = languageFilter.value;
      updateTable();
    });
    if (sortFieldSelect) sortFieldSelect.addEventListener('change', () => {
      filters.sortField = sortFieldSelect.value;
      updateTable();
    });
    if (sortDirectionBtn) {
      sortDirectionBtn.addEventListener('click', () => {
        filters.sortDirection = filters.sortDirection === 'asc' ? 'desc' : 'asc';
        sortDirectionBtn.textContent = filters.sortDirection === 'asc' ? '↑' : '↓';
        updateTable();
      });
    }
    if (foundationalFilter) {
      foundationalFilter.addEventListener('change', () => {
        filters.foundational = foundationalFilter.value;
        updateTable();
      });
    }

    updateTable();
  } catch (error) {
    console.error('Error loading courses:', error);
    const message = error instanceof Error ? error.message : String(error);

    // Include the current page URL to make diagnosing GH Pages path issues trivial.
    showError(`Error loading data: ${message}`, `page=${window.location.href}`);
  }
})();

