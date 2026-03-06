import semver from "semver";

export interface VersionSample {
  version: string;
  matches: boolean;
}

export interface Explanation {
  input: string;
  valid: boolean;
  error?: string;
  summary: string;
  resolvedTo: string;
  operatorLabel: string;
  operatorDetail: string;
  samples: VersionSample[];
}

type Op = "^" | "~" | "=" | ">=" | ">" | "<=" | "<" | "hyphen" | "||" | "range" | "*";

function detectOp(t: string): Op {
  if (t === "*" || t === "") return "*";
  if (t.startsWith("^")) return "^";
  if (t.startsWith("~")) return "~";
  if (t.includes(" - ")) return "hyphen";
  if (t.includes("||")) return "||";
  if (semver.valid(t)) return "=";
  if (t.startsWith(">=")) return ">=";
  if (t.startsWith(">")) return ">";
  if (t.startsWith("<=")) return "<=";
  if (t.startsWith("<")) return "<";
  return "range";
}

function summary(t: string, op: Op): string {
  switch (op) {
    case "*":
      return "Matches any version. No constraints — installs the latest available.";
    case "^": {
      const p = semver.parse(t.slice(1));
      if (!p) return `Compatible release starting at ${t.slice(1)}.`;
      if (p.major > 0)
        return `Compatible with ${t.slice(1)}. Allows ≥${t.slice(1)} and <${p.major + 1}.0.0 — the major version is locked, minor and patch updates are permitted.`;
      if (p.minor > 0)
        return `Compatible with ${t.slice(1)}. Major is 0, so only patch updates are allowed: ≥${t.slice(1)} and <0.${p.minor + 1}.0. The 0.x series is treated as unstable.`;
      return `Exactly ${t.slice(1)}. When both major and minor are 0, the caret locks everything — even patches could be breaking.`;
    }
    case "~": {
      const ver = t.slice(1);
      const p = semver.parse(ver);
      if (p)
        return `Approximately ${ver}. Patch-level updates only: ≥${ver} and <${p.major}.${p.minor + 1}.0. Bug fixes in, new features out.`;
      const parts = ver.split(".");
      if (parts.length === 2)
        return `Any version in the ${ver}.x range: ≥${ver}.0 and <${parts[0]}.${Number(parts[1]) + 1}.0.`;
      return `Any version with major ${ver}: ≥${ver}.0.0 and <${Number(ver) + 1}.0.0.`;
    }
    case "=":
      return `Pinned to exactly ${t}. No updates allowed — only this exact version.`;
    case ">=":
      return `Any version from ${t.slice(2).trim()} onward. No upper bound — will always accept newer releases.`;
    case ">":
      return `Any version strictly newer than ${t.slice(1).trim()}. That version itself is excluded.`;
    case "<=":
      return `Version ${t.slice(2).trim()} or any older version. Usually paired with a lower bound.`;
    case "<":
      return `Any version strictly older than ${t.slice(1).trim()}. That version itself is excluded.`;
    case "hyphen": {
      const [from, , to] = t.split(" ");
      return `Inclusive range from ${from} to ${to}. Both endpoints are included (≥${from} and ≤${to}).`;
    }
    case "||":
      return "A union range — matches versions satisfying any of the individual conditions (logical OR).";
    case "range":
      return "An intersection range — all comparators must be satisfied simultaneously (logical AND).";
  }
}

const LABELS: Record<Op, string> = {
  "^": "Caret Range (^)",
  "~": "Tilde Range (~)",
  "=": "Exact Version",
  ">=": "Greater Than or Equal (>=)",
  ">": "Greater Than (>)",
  "<=": "Less Than or Equal (<=)",
  "<": "Less Than (<)",
  hyphen: "Hyphen Range",
  "||": "Union Range (||)",
  range: "Intersection Range",
  "*": "Wildcard (*)",
};

const DETAILS: Record<Op, string> = {
  "^": "Locks the leftmost non-zero version digit. This is the npm default — it assumes the library follows SemVer, where major bumps are breaking and minor/patch are safe.",
  "~": "More conservative than caret. Only allows patch updates (bug fixes) when a minor version is given. Good for libraries whose minor releases have historically been risky.",
  "=": "Pins to a single release. Nothing newer is accepted. Common in lockfiles or when a specific version is known-good.",
  ">=": "Open lower bound. Accepts all future major versions — use carefully, major bumps often mean breaking changes.",
  ">": "Exclusive lower bound. The specified version itself is not accepted. Often paired with < to form a bounded range.",
  "<=": "Accepts everything up to and including the specified version. Usually paired with >= or >.",
  "<": "Exclusive upper bound. Keeps you below a breaking release. The specified version is not included.",
  hyphen: "Inclusive on both ends. `1.0.0 - 2.0.0` is equivalent to `>=1.0.0 <=2.0.0`.",
  "||": "Logical OR — only one condition needs to match. Common for packages that support multiple major versions, e.g. `^1.0.0 || ^2.0.0`.",
  range: "Multiple comparators with an implicit AND — all conditions must pass. This is how caret/tilde ranges are represented internally after expansion.",
  "*": "No constraints. Equivalent to an empty string. Installs the absolute latest published version.",
};

function resolvedForm(range: semver.Range, input: string): string {
  if (input === "*" || input === "") return "*";
  try {
    const out = range.set
      .map((cs) =>
        cs
          .map((c) => c.value.replace(/-0\b/g, "").trim())
          .filter(Boolean)
          .join(" ")
      )
      .join(" || ");
    return out || "*";
  } catch {
    return input;
  }
}

function generateSamples(rangeStr: string, range: semver.Range): VersionSample[] {
  const candidates = new Set<string>();
  const versionRe = /(\d+)\.(\d+)\.(\d+)/g;
  let m: RegExpExecArray | null;
  const seeds: [number, number, number][] = [];

  while ((m = versionRe.exec(rangeStr)) !== null) {
    seeds.push([+m[1], +m[2], +m[3]]);
  }
  if (seeds.length === 0) seeds.push([1, 0, 0]);

  for (const [M, m2, p] of seeds) {
    for (const dM of [-1, 0, 1, 2]) {
      const maj = Math.max(0, M + dM);
      candidates.add(`${maj}.0.0`);
      for (const dm of [0, 1, 2]) {
        const min = Math.max(0, m2 + dm);
        candidates.add(`${maj}.${min}.0`);
        for (const dp of [-1, 0, 1, 3, 9]) {
          const pat = Math.max(0, p + dp);
          candidates.add(`${maj}.${min}.${pat}`);
        }
      }
    }
    if (m2 > 0) candidates.add(`${M}.${m2 - 1}.9`);
  }

  const all = [...candidates]
    .filter((v) => semver.valid(v))
    .sort((a, b) => semver.compare(a, b))
    .map((v) => ({ version: v, matches: semver.satisfies(v, range) }));

  const matching = all.filter((r) => r.matches);
  const nonMatching = all.filter((r) => !r.matches);

  function spread<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr;
    const out = [arr[0]];
    const step = (arr.length - 1) / (n - 1);
    for (let i = 1; i < n - 1; i++) out.push(arr[Math.round(step * i)]);
    out.push(arr[arr.length - 1]);
    return out;
  }

  const picked = [
    ...spread(matching, Math.min(matching.length, 8)),
    ...nonMatching.slice(0, 5),
  ].sort((a, b) => semver.compare(a.version, b.version));

  const seen = new Set<string>();
  return picked.filter(({ version }) => {
    if (seen.has(version)) return false;
    seen.add(version);
    return true;
  });
}

export function explainRange(input: string): Explanation {
  const t = input.trim();
  let range: semver.Range;
  try {
    range = new semver.Range(t);
  } catch {
    return {
      input,
      valid: false,
      error: `"${t}" is not a valid semver range.`,
      summary: "",
      resolvedTo: "",
      operatorLabel: "",
      operatorDetail: "",
      samples: [],
    };
  }

  const op = detectOp(t);
  const resolved = resolvedForm(range, t);
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  const showResolved = normalize(resolved) !== normalize(t);

  return {
    input,
    valid: true,
    summary: summary(t, op),
    resolvedTo: showResolved ? resolved : "",
    operatorLabel: LABELS[op],
    operatorDetail: DETAILS[op],
    samples: generateSamples(t, range),
  };
}
