export interface ProjectDefinition {
  id: string;
  name: string;
  aliases: string[];
  repositoryPath: string;
  preferredAgent?: "CHATGPT" | "CODEX";
}

export interface ProjectMatch {
  project: ProjectDefinition;
  matchedAlias: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class ProjectRegistry {
  private readonly projects = new Map<string, ProjectDefinition>();

  constructor(projects: ProjectDefinition[] = []) {
    for (const project of projects) {
      this.register(project);
    }
  }

  register(project: ProjectDefinition): void {
    if (this.projects.has(project.id)) {
      throw new Error(`Project '${project.id}' is already registered.`);
    }
    this.projects.set(project.id, project);
  }

  get(id: string): ProjectDefinition | undefined {
    return this.projects.get(id);
  }

  resolve(reference: string): ProjectMatch | null {
    const target = normalize(reference);
    if (!target) {
      return null;
    }

    const candidates: Array<{ project: ProjectDefinition; alias: string; score: number }> = [];

    for (const project of this.projects.values()) {
      const aliases = [project.id, project.name, ...project.aliases];
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);
        if (!normalizedAlias) continue;

        let score = 0;
        if (target === normalizedAlias) score = 1000 + normalizedAlias.length;
        else if (target.includes(normalizedAlias)) score = 500 + normalizedAlias.length;
        else if (normalizedAlias.includes(target) && target.length >= 3) score = 100 + target.length;

        if (score > 0) {
          candidates.push({ project, alias, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return best ? { project: best.project, matchedAlias: best.alias } : null;
  }

  list(): ProjectDefinition[] {
    return [...this.projects.values()];
  }
}
