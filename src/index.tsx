import { Hono } from "hono";
import { explainRange, type Explanation, type VersionSample } from "./explain";

const app = new Hono();

function Layout({ children, title }: { children: any; title?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} — semvercheck` : "semvercheck"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-white text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

const EXAMPLES = [
  { range: "^1.2.3", label: "compatible" },
  { range: "~2.0.0", label: "patch only" },
  { range: ">=1.5.0 <2.0.0", label: "bounded" },
  { range: "1.x", label: "x-range" },
  { range: "^1.0.0 || ^2.0.0", label: "union" },
  { range: "*", label: "any" },
];

function SearchForm({ value }: { value: string }) {
  return (
    <form method="GET" action="/" class="flex gap-2">
      <input
        type="text"
        name="range"
        value={value}
        placeholder="e.g. ^1.2.3"
        spellcheck="false"
        autocomplete="off"
        class="flex-1 font-mono bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
      />
      <button
        type="submit"
        class="px-5 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        Explain
      </button>
    </form>
  );
}

function Badge({ version, matches }: VersionSample) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs border";
  const cls = matches
    ? `${base} bg-green-50 text-green-700 border-green-200`
    : `${base} bg-slate-100 text-slate-400 border-slate-200`;
  return (
    <span class={cls}>
      {version}
      <span class={matches ? "text-green-500" : "text-slate-300"}>{matches ? "✓" : "✗"}</span>
    </span>
  );
}

function Result({ ex }: { ex: Explanation }) {
  if (!ex.valid) {
    return (
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p class="text-sm text-red-700">
          <span class="font-semibold">Invalid range:</span> {ex.error}
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
        <p class="text-slate-900 leading-relaxed">{ex.summary}</p>
      </div>

      {ex.resolvedTo && (
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-400 shrink-0">Resolves to</span>
          <code class="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded font-mono text-sm border border-indigo-100">
            {ex.resolvedTo}
          </code>
        </div>
      )}

      <div>
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
          {ex.operatorLabel}
        </p>
        <p class="text-sm text-slate-600 leading-relaxed">{ex.operatorDetail}</p>
      </div>

      {ex.samples.length > 0 && (
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Sample versions
          </p>
          <div class="flex flex-wrap gap-2">
            {ex.samples.map((s) => (
              <Badge version={s.version} matches={s.matches} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

app.get("/", (c) => {
  const range = c.req.query("range") ?? "";
  const ex = range ? explainRange(range) : null;

  return c.html(
    <Layout title={range || undefined}>
      <div class="max-w-2xl mx-auto px-4 py-12">
        <div class="mb-8">
          <h1 class="text-2xl font-bold tracking-tight">semvercheck</h1>
          <p class="text-slate-500 mt-1 text-sm">
            Decode any npm version range in plain English.
          </p>
        </div>

        <div class="mb-8">
          <SearchForm value={range} />
          {!range && (
            <div class="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map(({ range: r, label }) => (
                <a
                  href={`/?range=${encodeURIComponent(r)}`}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <span class="font-mono text-xs text-slate-700">{r}</span>
                  <span class="text-xs text-slate-400">{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {ex && <Result ex={ex} />}

        <footer class="mt-16 pt-6 border-t border-slate-100">
          <p class="text-xs text-slate-400">
            Uses the{" "}
            <a
              href="https://github.com/npm/node-semver"
              class="underline hover:text-slate-600"
            >
              node-semver
            </a>{" "}
            spec. Made by{" "}
            <a href="https://github.com/srmdn" class="underline hover:text-slate-600">
              srmdn
            </a>
            .
          </p>
        </footer>
      </div>
    </Layout>
  );
});

export default {
  port: 3000,
  fetch: app.fetch,
};
