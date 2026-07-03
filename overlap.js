/** @typedef {{ specId: string, name: string, courses: Set<string> }} SpecCourseSet */

export function collectCoursesFromMapping(specMeta) {
  const ids = new Set();
  if (!specMeta || typeof specMeta !== 'object') return ids;

  const addGroup = (groups) => {
    if (!Array.isArray(groups)) return;
    groups.forEach((group) => {
      if (!group || !Array.isArray(group.courses)) return;
      group.courses.forEach((id) => {
        if (typeof id === 'string' && id.trim()) ids.add(id.trim());
      });
    });
  };

  addGroup(specMeta.core);
  addGroup(specMeta.electives);
  return ids;
}

/** @returns {SpecCourseSet[]} */
export function buildSpecCourseSets(mappingData, specializationsData) {
  if (!mappingData || typeof mappingData !== 'object') return [];

  return Object.keys(mappingData)
    .map((specId) => {
      const name =
        (specializationsData &&
          specializationsData[specId] &&
          specializationsData[specId].name) ||
        `Specialization ${specId}`;
      return {
        specId,
        name,
        courses: collectCoursesFromMapping(mappingData[specId])
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function intersect(a, b) {
  const out = new Set();
  a.forEach((id) => {
    if (b.has(id)) out.add(id);
  });
  return out;
}

function onlyIn(a, b) {
  const out = new Set();
  a.forEach((id) => {
    if (!b.has(id)) out.add(id);
  });
  return out;
}

function overlapIntensity(count, max) {
  if (!max) return 'bg-bg-color text-black/50';
  const ratio = count / max;
  if (ratio === 0) return 'bg-bg-color text-black/50';
  if (ratio < 0.25) return 'bg-accent/15 text-black';
  if (ratio < 0.5) return 'bg-accent/30 text-black';
  if (ratio < 0.75) return 'bg-accent/55 text-black';
  return 'bg-accent text-white';
}

export function renderPairwiseMatrix(container, specSets) {
  if (!container) return;
  if (!specSets.length) {
    container.innerHTML = '<p class="text-sm text-black/60">No specialization data available.</p>';
    return;
  }

  let maxOverlap = 0;
  specSets.forEach((a, i) => {
    specSets.forEach((b, j) => {
      if (i === j) return;
      const size = intersect(a.courses, b.courses).size;
      if (size > maxOverlap) maxOverlap = size;
    });
  });

  const header = specSets
    .map(
      (spec) =>
        `<th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-black/70">${spec.name}</th>`
    )
    .join('');

  const rows = specSets
    .map((rowSpec) => {
      const cells = specSets
        .map((colSpec) => {
          if (rowSpec.specId === colSpec.specId) {
            return `<td class="px-3 py-2 text-center text-xs font-semibold text-black/40">—</td>`;
          }
          const count = intersect(rowSpec.courses, colSpec.courses).size;
          const tone = overlapIntensity(count, maxOverlap);
          return `<td class="px-3 py-2 text-center text-xs font-semibold ${tone}">${count}</td>`;
        })
        .join('');
      return `<tr class="border-t border-black/10"><th class="px-3 py-2 text-left text-xs font-medium text-black">${rowSpec.name}</th>${cells}</tr>`;
    })
    .join('');

  container.innerHTML = `
    <p class="mb-3 text-sm text-black/70">Shared course counts between specializations. Darker cells mean more overlap.</p>
    <div class="overflow-x-auto rounded-[28px] border border-black/10">
      <table class="min-w-full border-separate border-spacing-0 bg-white text-sm">
        <thead>
          <tr class="bg-bg-color">
            <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-black/70"></th>
            ${header}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function courseListHtml(courses) {
  if (!courses.length) return '<span class="text-black/50">None</span>';
  return courses
    .map(
      (id) =>
        `<span class="mr-1 mb-1 inline-flex rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold text-black">${id}</span>`
    )
    .join('');
}

function renderVennTwo(container, specs) {
  const [a, b] = specs;
  const ab = intersect(a.courses, b.courses);
  const onlyA = onlyIn(a.courses, b.courses);
  const onlyB = onlyIn(b.courses, a.courses);

  container.innerHTML = `
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <svg viewBox="0 0 360 220" class="mx-auto w-full max-w-md" aria-label="Two-set Venn diagram">
        <circle cx="130" cy="110" r="78" fill="#86b58f" fill-opacity="0.35" stroke="#1b1b1b" stroke-opacity="0.15" />
        <circle cx="230" cy="110" r="78" fill="#86b58f" fill-opacity="0.35" stroke="#1b1b1b" stroke-opacity="0.15" />
        <text x="88" y="112" text-anchor="middle" class="fill-black text-[13px] font-semibold">${onlyA.size}</text>
        <text x="180" y="112" text-anchor="middle" class="fill-black text-[15px] font-bold">${ab.size}</text>
        <text x="272" y="112" text-anchor="middle" class="fill-black text-[13px] font-semibold">${onlyB.size}</text>
        <text x="88" y="28" text-anchor="middle" class="fill-black text-[11px] font-semibold">${a.name}</text>
        <text x="272" y="28" text-anchor="middle" class="fill-black text-[11px] font-semibold">${b.name}</text>
      </svg>
      <div class="flex-1 space-y-4 text-sm">
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Only ${a.name}</p>
          <div class="mt-2 flex flex-wrap">${courseListHtml([...onlyA].sort())}</div>
        </div>
        <div class="rounded-3xl border border-black/10 bg-accent/10 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Shared</p>
          <div class="mt-2 flex flex-wrap">${courseListHtml([...ab].sort())}</div>
        </div>
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Only ${b.name}</p>
          <div class="mt-2 flex flex-wrap">${courseListHtml([...onlyB].sort())}</div>
        </div>
      </div>
    </div>
  `;
}

function renderVennThree(container, specs) {
  const [a, b, c] = specs;
  const ab = intersect(a.courses, b.courses);
  const ac = intersect(a.courses, c.courses);
  const bc = intersect(b.courses, c.courses);
  const abc = intersect(ab, c.courses);

  const onlyA = new Set([...a.courses].filter((id) => !b.courses.has(id) && !c.courses.has(id)));
  const onlyB = new Set([...b.courses].filter((id) => !a.courses.has(id) && !c.courses.has(id)));
  const onlyC = new Set([...c.courses].filter((id) => !a.courses.has(id) && !b.courses.has(id)));
  const abOnly = new Set([...ab].filter((id) => !c.courses.has(id)));
  const acOnly = new Set([...ac].filter((id) => !b.courses.has(id)));
  const bcOnly = new Set([...bc].filter((id) => !a.courses.has(id)));

  container.innerHTML = `
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <svg viewBox="0 0 360 260" class="mx-auto w-full max-w-md" aria-label="Three-set Venn diagram">
        <circle cx="130" cy="105" r="72" fill="#86b58f" fill-opacity="0.3" stroke="#1b1b1b" stroke-opacity="0.15" />
        <circle cx="230" cy="105" r="72" fill="#86b58f" fill-opacity="0.3" stroke="#1b1b1b" stroke-opacity="0.15" />
        <circle cx="180" cy="175" r="72" fill="#86b58f" fill-opacity="0.3" stroke="#1b1b1b" stroke-opacity="0.15" />
        <text x="95" y="88" text-anchor="middle" class="fill-black text-[12px] font-semibold">${onlyA.size}</text>
        <text x="265" y="88" text-anchor="middle" class="fill-black text-[12px] font-semibold">${onlyB.size}</text>
        <text x="180" y="228" text-anchor="middle" class="fill-black text-[12px] font-semibold">${onlyC.size}</text>
        <text x="180" y="108" text-anchor="middle" class="fill-black text-[12px] font-semibold">${abOnly.size}</text>
        <text x="148" y="158" text-anchor="middle" class="fill-black text-[12px] font-semibold">${acOnly.size}</text>
        <text x="212" y="158" text-anchor="middle" class="fill-black text-[12px] font-semibold">${bcOnly.size}</text>
        <text x="180" y="132" text-anchor="middle" class="fill-black text-[14px] font-bold">${abc.size}</text>
        <text x="95" y="24" text-anchor="middle" class="fill-black text-[10px] font-semibold">${a.name}</text>
        <text x="265" y="24" text-anchor="middle" class="fill-black text-[10px] font-semibold">${b.name}</text>
        <text x="180" y="252" text-anchor="middle" class="fill-black text-[10px] font-semibold">${c.name}</text>
      </svg>
      <div class="flex-1 grid gap-3 sm:grid-cols-2 text-sm">
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">All three</p><div class="mt-2 flex flex-wrap">${courseListHtml([...abc].sort())}</div></div>
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">${a.name} only</p><div class="mt-2 flex flex-wrap">${courseListHtml([...onlyA].sort())}</div></div>
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">${b.name} only</p><div class="mt-2 flex flex-wrap">${courseListHtml([...onlyB].sort())}</div></div>
        <div class="rounded-3xl border border-black/10 bg-bg-color p-4"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">${c.name} only</p><div class="mt-2 flex flex-wrap">${courseListHtml([...onlyC].sort())}</div></div>
      </div>
    </div>
  `;
}

export function renderVennDiagram(container, selectedSpecIds, specSets) {
  if (!container) return;

  const selected = selectedSpecIds
    .map((id) => specSets.find((spec) => spec.specId === id))
    .filter(Boolean);

  if (selected.length < 2) {
    container.innerHTML =
      '<p class="rounded-3xl border border-black/10 bg-bg-color px-4 py-6 text-sm text-black/60">Select 2 or 3 specializations above to view a Venn-style overlap diagram.</p>';
    return;
  }

  if (selected.length === 2) {
    renderVennTwo(container, selected);
    return;
  }

  renderVennThree(container, selected.slice(0, 3));
}

export function initOverlapView({ matrixEl, vennEl, pickerEl, specSets }) {
  if (pickerEl) {
    pickerEl.innerHTML = specSets
      .map(
        (spec) => `
          <label class="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-bg-color">
            <input type="checkbox" value="${spec.specId}" class="overlap-spec-cb h-4 w-4 rounded border-black/20 text-accent focus:ring-accent/30" />
            <span class="flex-1 text-sm text-black">${spec.name}</span>
            <span class="text-xs text-black/50">${spec.courses.size} courses</span>
          </label>
        `
      )
      .join('');
  }

  renderPairwiseMatrix(matrixEl, specSets);

  const getSelected = () =>
    pickerEl
      ? [...pickerEl.querySelectorAll('.overlap-spec-cb:checked')].map((cb) => cb.value).slice(0, 3)
      : [];

  const updateVenn = () => {
    renderVennDiagram(vennEl, getSelected(), specSets);
  };

  if (pickerEl) {
    pickerEl.addEventListener('change', (event) => {
      const checkbox = event.target;
      if (!checkbox.matches('.overlap-spec-cb')) return;

      const checked = pickerEl.querySelectorAll('.overlap-spec-cb:checked');
      if (checked.length > 3) {
        checkbox.checked = false;
        return;
      }
      updateVenn();
    });
  }

  updateVenn();
}
