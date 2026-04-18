import { mkdir, writeFile } from 'node:fs/promises';

const SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/omshub/data/main/static/courses.json',
    outFile: 'data/courses.json'
  },
  {
    url: 'https://raw.githubusercontent.com/omshub/data/main/static/specializations.json',
    outFile: 'data/specializations.json'
  },
  {
    url: 'https://raw.githubusercontent.com/omshub/data/main/static/course-stats.json',
    outFile: 'data/course-stats.json'
  }
] as const;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`);
  }
  return await res.json();
}

async function main(): Promise<void> {
  await mkdir('data', { recursive: true });

  const payloads = await Promise.all(
    SOURCES.map(async ({ url, outFile }) => {
      const json = await fetchJson(url);
      return { url, outFile, json };
    })
  );

  await Promise.all(
    payloads.map(async ({ outFile, json }) => {
      await writeFile(outFile, JSON.stringify(json, null, 2) + '\n', 'utf8');
    })
  );

  payloads.forEach(({ url, outFile }) => {
    console.log(`Wrote ${outFile} from ${url}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

