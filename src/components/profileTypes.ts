export type VisibilityStatus = "eligible" | "private" | "excluded";

export type ProfileLink = {
  id: string;
  label: string;
  url: string;
  visibility: VisibilityStatus;
};

export type ProfileBasics = {
  fullName: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  summary: string;
  links: ProfileLink[];
  visibility: VisibilityStatus;
};

export type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
  technologies: string[];
  visibility: VisibilityStatus;
};

export type ProjectEntry = {
  id: string;
  title: string;
  url: string;
  repository: string;
  startDate: string;
  endDate: string;
  description: string;
  bullets: string[];
  technologies: string[];
  visibility: VisibilityStatus;
};

export type EducationEntry = {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  notes: string;
  visibility: VisibilityStatus;
};

export type SkillGroup = {
  id: string;
  category: string;
  skills: string[];
  context: string;
  relatedFactIds: string[];
  visibility: VisibilityStatus;
};

export type OptionalSection = {
  id: string;
  type: string;
  title: string;
  organization: string;
  date: string;
  description: string;
  bullets: string[];
  visibility: VisibilityStatus;
};

export type ProfilePrivacy = {
  defaultVisibility: VisibilityStatus;
  requireAiEgressReview: boolean;
  keepContactPrivateByDefault: boolean;
  notes: string;
};

export type ResumeProfile = {
  schemaVersion: number;
  basics: ProfileBasics;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  optionalSections: OptionalSection[];
  privacy: ProfilePrivacy;
  updatedAt: string;
};

export const visibilityOptions: Array<{
  value: VisibilityStatus;
  label: string;
  description: string;
}> = [
  {
    value: "eligible",
    label: "Resume-ready",
    description: "This fact can be used in generated drafts.",
  },
  {
    value: "private",
    label: "Private",
    description: "Keep this fact in the vault, but out of AI context.",
  },
  {
    value: "excluded",
    label: "Excluded",
    description: "Do not use this fact unless manually changed later.",
  },
];

const nowIso = () => new Date().toISOString();

export const createProfileId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createEmptyProfile = (): ResumeProfile => ({
  schemaVersion: 1,
  basics: {
    fullName: "",
    headline: "",
    location: "",
    email: "",
    phone: "",
    website: "",
    summary: "",
    links: [
      {
        id: createProfileId("link"),
        label: "",
        url: "",
        visibility: "eligible",
      },
    ],
    visibility: "eligible",
  },
  experience: [],
  projects: [],
  education: [],
  skills: [],
  optionalSections: [],
  privacy: {
    defaultVisibility: "eligible",
    requireAiEgressReview: true,
    keepContactPrivateByDefault: true,
    notes: "",
  },
  updatedAt: nowIso(),
});

export const createEmptyExperience = (): ExperienceEntry => ({
  id: createProfileId("experience"),
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
  bullets: [""],
  technologies: [],
  visibility: "eligible",
});

export const createEmptyProject = (): ProjectEntry => ({
  id: createProfileId("project"),
  title: "",
  url: "",
  repository: "",
  startDate: "",
  endDate: "",
  description: "",
  bullets: [""],
  technologies: [],
  visibility: "eligible",
});

export const createEmptyEducation = (): EducationEntry => ({
  id: createProfileId("education"),
  school: "",
  degree: "",
  field: "",
  location: "",
  startDate: "",
  endDate: "",
  notes: "",
  visibility: "eligible",
});

export const createEmptySkillGroup = (): SkillGroup => ({
  id: createProfileId("skill"),
  category: "",
  skills: [],
  context: "",
  relatedFactIds: [],
  visibility: "eligible",
});

export const createEmptyOptionalSection = (): OptionalSection => ({
  id: createProfileId("optional"),
  type: "Certification",
  title: "",
  organization: "",
  date: "",
  description: "",
  bullets: [""],
  visibility: "eligible",
});

export const createSampleProfile = (): ResumeProfile => ({
  schemaVersion: 1,
  basics: {
    fullName: "Maya Rios",
    headline: "Product-minded full-stack engineer",
    location: "Chicago, IL",
    email: "maya.rios@example.com",
    phone: "+1 (312) 847-1928",
    website: "https://mayarios.dev",
    summary:
      "Full-stack engineer focused on reliable internal tools, data-heavy interfaces, and production systems that make operational teams faster.",
    visibility: "eligible",
    links: [
      {
        id: createProfileId("link"),
        label: "Portfolio",
        url: "https://mayarios.dev",
        visibility: "eligible",
      },
      {
        id: createProfileId("link"),
        label: "GitHub",
        url: "https://github.com/mrios",
        visibility: "eligible",
      },
    ],
  },
  experience: [
    {
      id: createProfileId("experience"),
      company: "Northline Health",
      role: "Senior Software Engineer",
      location: "Remote",
      startDate: "2022-03",
      endDate: "",
      isCurrent: true,
      description:
        "Builds workflow software for care operations teams that manage appointment routing, eligibility checks, and reporting.",
      bullets: [
        "Led a React and TypeScript rewrite of scheduling dashboards used by 38 operations staff.",
        "Reduced manual review time by adding audit-friendly queue filters and bulk actions.",
      ],
      technologies: ["React", "TypeScript", "Node", "PostgreSQL"],
      visibility: "eligible",
    },
  ],
  projects: [
    {
      id: createProfileId("project"),
      title: "Local Metrics Workbench",
      url: "https://mayarios.dev/workbench",
      repository: "https://github.com/mrios/local-metrics",
      startDate: "2024-01",
      endDate: "2024-04",
      description:
        "Offline-first analytics workspace for importing CSV exports and building reusable operational reports.",
      bullets: [
        "Designed import validation, saved report templates, and a zero-network review mode.",
      ],
      technologies: ["SQLite", "React", "Electron"],
      visibility: "eligible",
    },
  ],
  education: [
    {
      id: createProfileId("education"),
      school: "DePaul University",
      degree: "B.S.",
      field: "Computer Science",
      location: "Chicago, IL",
      startDate: "2016",
      endDate: "2020",
      notes: "Coursework in databases, distributed systems, and human-computer interaction.",
      visibility: "eligible",
    },
  ],
  skills: [
    {
      id: createProfileId("skill"),
      category: "Frontend",
      skills: ["React", "TypeScript", "Accessibility", "Data visualization"],
      context: "Applied in production workflow tools and reporting surfaces.",
      relatedFactIds: [],
      visibility: "eligible",
    },
    {
      id: createProfileId("skill"),
      category: "Backend",
      skills: ["Node", "Electron", "SQLite", "PostgreSQL"],
      context: "Used for desktop shell services, local storage, migrations, and background jobs.",
      relatedFactIds: [],
      visibility: "eligible",
    },
  ],
  optionalSections: [
    {
      id: createProfileId("optional"),
      type: "Certification",
      title: "AWS Certified Cloud Practitioner",
      organization: "Amazon Web Services",
      date: "2023",
      description: "Cloud fundamentals certification.",
      bullets: ["Validates cloud architecture, security, and billing fundamentals."],
      visibility: "private",
    },
  ],
  privacy: {
    defaultVisibility: "eligible",
    requireAiEgressReview: true,
    keepContactPrivateByDefault: true,
    notes:
      "Contact details stay local unless a resume draft explicitly needs them. AI calls must show an egress preview first.",
  },
  updatedAt: nowIso(),
});

const coerceString = (value: unknown) => (typeof value === "string" ? value : "");

const coerceBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const coerceVisibility = (value: unknown): VisibilityStatus => {
  if (value === "generation-eligible") {
    return "eligible";
  }

  if (value === "private" || value === "excluded" || value === "eligible") {
    return value;
  }

  return "eligible";
};

const coerceStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const coerceDateRange = (value: unknown) => {
  const dateRange = asRecord(value);

  return {
    start: coerceString(dateRange.start),
    end: coerceString(dateRange.end),
    isCurrent: coerceBoolean(dateRange.isCurrent),
  };
};

const coerceEligibleFactTextList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => coerceVisibility(asRecord(item).visibility) === "eligible")
    .map((item) => coerceString(asRecord(item).text))
    .filter(Boolean);
};

const coerceEligibleFactTags = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags = value
    .filter((item) => coerceVisibility(asRecord(item).visibility) === "eligible")
    .flatMap((item) => coerceStringList(asRecord(item).tags));
  return Array.from(new Set(tags));
};

const firstLinkUrl = (value: unknown) => {
  if (!Array.isArray(value)) {
    return "";
  }

  const firstLink = asRecord(value[0]);
  return coerceString(firstLink.url);
};

const repositoryLinkToProfileLink = (item: unknown): ProfileLink => {
  const link = asRecord(item);

  return {
    id: coerceString(link.id) || createProfileId("link"),
    label: coerceString(link.label),
    url: coerceString(link.url),
    visibility: coerceVisibility(link.visibility),
  };
};

export const normalizeProfile = (value: unknown): ResumeProfile => {
  const source = asRecord(value);
  const fallback = createEmptyProfile();
  const basics = asRecord(source.basics);
  const privacy = asRecord(source.privacy);
  const sourceExperience = Array.isArray(source.experience)
    ? source.experience
    : source.workExperiences;
  const sourceSkills = Array.isArray(source.skills)
    ? source.skills
    : source.skillGroups;

  return {
    schemaVersion:
      typeof source.schemaVersion === "number"
        ? source.schemaVersion
        : fallback.schemaVersion,
    basics: {
      fullName: coerceString(basics.fullName),
      headline: coerceString(basics.headline),
      location: coerceString(basics.location),
      email: coerceString(basics.email),
      phone: coerceString(basics.phone),
      website: coerceString(basics.website) || firstLinkUrl(basics.links),
      summary: coerceString(basics.summary),
      visibility: coerceVisibility(basics.visibility),
      links: Array.isArray(basics.links)
        ? basics.links.map(repositoryLinkToProfileLink)
        : fallback.basics.links,
    },
    experience: Array.isArray(sourceExperience)
      ? sourceExperience.map((item) => {
          const entry = asRecord(item);
          const dateRange = coerceDateRange(entry.dateRange);
          return {
            id: coerceString(entry.id) || createProfileId("experience"),
            company: coerceString(entry.company),
            role: coerceString(entry.role),
            location: coerceString(entry.location),
            startDate: coerceString(entry.startDate) || dateRange.start,
            endDate: coerceString(entry.endDate) || dateRange.end,
            isCurrent: coerceBoolean(entry.isCurrent, dateRange.isCurrent),
            description: coerceString(entry.description),
            bullets:
              coerceStringList(entry.bullets).length > 0
                ? coerceStringList(entry.bullets)
                : coerceEligibleFactTextList(entry.bulletFacts),
            technologies:
              coerceStringList(entry.technologies).length > 0
                ? coerceStringList(entry.technologies)
                : coerceEligibleFactTags(entry.bulletFacts),
            visibility: coerceVisibility(entry.visibility),
          };
        })
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects.map((item) => {
          const entry = asRecord(item);
          const dateRange = coerceDateRange(entry.dateRange);
          const links = Array.isArray(entry.links)
            ? entry.links.map(repositoryLinkToProfileLink)
            : [];
          const repositoryLink = links.find((link) =>
            `${link.label} ${link.url}`.toLowerCase().includes("git"),
          );
          return {
            id: coerceString(entry.id) || createProfileId("project"),
            title: coerceString(entry.title),
            url: coerceString(entry.url) || links[0]?.url || "",
            repository: coerceString(entry.repository) || repositoryLink?.url || "",
            startDate: coerceString(entry.startDate) || dateRange.start,
            endDate: coerceString(entry.endDate) || dateRange.end,
            description: coerceString(entry.description),
            bullets:
              coerceStringList(entry.bullets).length > 0
                ? coerceStringList(entry.bullets)
                : coerceEligibleFactTextList(entry.bulletFacts),
            technologies: coerceStringList(entry.technologies),
            visibility: coerceVisibility(entry.visibility),
          };
        })
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((item) => {
          const entry = asRecord(item);
          const dateRange = coerceDateRange(entry.dateRange);
          return {
            id: coerceString(entry.id) || createProfileId("education"),
            school: coerceString(entry.school),
            degree: coerceString(entry.degree),
            field: coerceString(entry.field),
            location: coerceString(entry.location),
            startDate: coerceString(entry.startDate) || dateRange.start,
            endDate: coerceString(entry.endDate) || dateRange.end,
            notes:
              coerceString(entry.notes) ||
              coerceEligibleFactTextList(entry.notes).join("\n"),
            visibility: coerceVisibility(entry.visibility),
          };
        })
      : [],
    skills: Array.isArray(sourceSkills)
      ? sourceSkills.map((item) => {
          const entry = asRecord(item);
          const skillRecords = Array.isArray(entry.skills)
            ? entry.skills.map(asRecord)
            : [];
          return {
            id: coerceString(entry.id) || createProfileId("skill"),
            category: coerceString(entry.category),
            skills:
              coerceStringList(entry.skills).length > 0
                ? coerceStringList(entry.skills)
                : skillRecords.map((skill) => coerceString(skill.name)).filter(Boolean),
            context:
              coerceString(entry.context) ||
              skillRecords
                .map((skill) => coerceString(skill.context))
                .filter(Boolean)
                .join("; "),
            relatedFactIds:
              coerceStringList(entry.relatedFactIds).length > 0
                ? coerceStringList(entry.relatedFactIds)
                : Array.from(
                    new Set(
                      skillRecords.flatMap((skill) =>
                        coerceStringList(skill.relatedFactIds),
                      ),
                    ),
                  ),
            visibility: coerceVisibility(entry.visibility),
          };
        })
      : [],
    optionalSections: Array.isArray(source.optionalSections)
      ? source.optionalSections.flatMap((item) => {
          const entry = asRecord(item);
          const items = Array.isArray(entry.items) ? entry.items : [];

          if (items.length > 0) {
            return items.map((sectionItem) => {
              const optionalItem = asRecord(sectionItem);
              const dateRange = coerceDateRange(optionalItem.dateRange);
              return {
                id: coerceString(optionalItem.id) || createProfileId("optional"),
                type: coerceString(entry.type) || coerceString(entry.kind) || "Custom",
                title: coerceString(optionalItem.title),
                organization: coerceString(optionalItem.organization) || coerceString(optionalItem.subtitle),
                date: coerceString(optionalItem.date) || dateRange.start,
                description: coerceString(optionalItem.description),
                bullets:
                  coerceStringList(optionalItem.bullets).length > 0
                    ? coerceStringList(optionalItem.bullets)
                    : coerceEligibleFactTextList(optionalItem.bulletFacts),
                visibility: coerceVisibility(
                  optionalItem.visibility ?? entry.visibility,
                ),
              };
            });
          }

          return [{
            id: coerceString(entry.id) || createProfileId("optional"),
            type: coerceString(entry.type) || coerceString(entry.kind) || "Custom",
            title: coerceString(entry.title),
            organization: coerceString(entry.organization),
            date: coerceString(entry.date),
            description: coerceString(entry.description),
            bullets:
              coerceStringList(entry.bullets).length > 0
                ? coerceStringList(entry.bullets)
                : coerceEligibleFactTextList(entry.bulletFacts),
            visibility: coerceVisibility(entry.visibility),
          }];
        })
      : [],
    privacy: {
      defaultVisibility: coerceVisibility(privacy.defaultVisibility),
      requireAiEgressReview: coerceBoolean(
        privacy.requireAiEgressReview,
        fallback.privacy.requireAiEgressReview,
      ),
      keepContactPrivateByDefault: coerceBoolean(
        privacy.keepContactPrivateByDefault,
        fallback.privacy.keepContactPrivateByDefault,
      ),
      notes: coerceString(privacy.notes),
    },
    updatedAt: coerceString(source.updatedAt) || nowIso(),
  };
};

const visibilityToRepository = (visibility: VisibilityStatus) =>
  visibility === "eligible" ? "generation-eligible" : visibility;

const timestampRecord = (id: string, timestamp: string) => ({
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const toRepositoryFact = (
  id: string,
  text: string,
  visibility: VisibilityStatus,
  tags: string[] = [],
) => ({
  ...timestampRecord(id, new Date().toISOString()),
  text,
  visibility: visibilityToRepository(visibility),
  tags,
});

const optionalKindToRepository = (type: string) => {
  const normalized = type.toLowerCase();

  if (normalized.includes("cert")) {
    return "certifications";
  }

  if (normalized.includes("award")) {
    return "awards";
  }

  if (normalized.includes("publication")) {
    return "publications";
  }

  if (normalized.includes("volunteer")) {
    return "volunteer";
  }

  return "custom";
};

export const toRepositoryProfile = (profile: ResumeProfile) => {
  const timestamp = profile.updatedAt || new Date().toISOString();
  const profileRecord = profile as ResumeProfile & {
    id?: string;
    createdAt?: string;
  };
  const basicsVisibility = visibilityToRepository(profile.basics.visibility);
  const contactVisibility = profile.privacy.keepContactPrivateByDefault
    ? "private"
    : basicsVisibility;
  const profileLinks = [...profile.basics.links];

  if (
    profile.basics.website.trim() &&
    !profileLinks.some((link) => link.url === profile.basics.website)
  ) {
    profileLinks.unshift({
      id: createProfileId("link"),
      label: "Website",
      url: profile.basics.website,
      visibility: profile.basics.visibility,
    });
  }

  return {
    schemaVersion: 1,
    id: profileRecord.id || "profile_local",
    createdAt: profileRecord.createdAt || timestamp,
    updatedAt: timestamp,
    basics: {
      ...timestampRecord("basics_local", timestamp),
      fullName: profile.basics.fullName,
      headline: profile.basics.headline,
      location: profile.basics.location,
      email: profile.basics.email,
      phone: profile.basics.phone,
      links: profileLinks
        .filter((link) => link.label.trim() || link.url.trim())
        .map((link) => ({
          ...timestampRecord(link.id, timestamp),
          label: link.label,
          url: link.url,
          visibility: visibilityToRepository(link.visibility),
        })),
      summary: profile.basics.summary,
      visibility: {
        fullName: basicsVisibility,
        headline: basicsVisibility,
        location: basicsVisibility,
        email: contactVisibility,
        phone: contactVisibility,
        summary: basicsVisibility,
      },
    },
    workExperiences: profile.experience.map((entry) => ({
      ...timestampRecord(entry.id, timestamp),
      company: entry.company,
      role: entry.role,
      location: entry.location,
      dateRange: {
        start: entry.startDate,
        end: entry.isCurrent || !entry.endDate ? null : entry.endDate,
        isCurrent: entry.isCurrent,
      },
      description: entry.description,
      bulletFacts: entry.bullets.map((bullet, index) =>
        toRepositoryFact(
          `${entry.id}_fact_${index + 1}`,
          bullet,
          entry.visibility,
          entry.technologies.map((technology) => technology.toLowerCase()),
        ),
      ),
      visibility: visibilityToRepository(entry.visibility),
    })),
    projects: profile.projects.map((entry) => ({
      ...timestampRecord(entry.id, timestamp),
      title: entry.title,
      links: [
        entry.url
          ? {
              ...timestampRecord(`${entry.id}_link_project`, timestamp),
              label: "Project",
              url: entry.url,
              visibility: visibilityToRepository(entry.visibility),
            }
          : null,
        entry.repository
          ? {
              ...timestampRecord(`${entry.id}_link_repository`, timestamp),
              label: "Repository",
              url: entry.repository,
              visibility: visibilityToRepository(entry.visibility),
            }
          : null,
      ].filter(Boolean),
      dateRange: {
        start: entry.startDate,
        end: entry.endDate || null,
        isCurrent: !entry.endDate,
      },
      technologies: entry.technologies,
      description: entry.description,
      bulletFacts: entry.bullets.map((bullet, index) =>
        toRepositoryFact(
          `${entry.id}_fact_${index + 1}`,
          bullet,
          entry.visibility,
          entry.technologies.map((technology) => technology.toLowerCase()),
        ),
      ),
      visibility: visibilityToRepository(entry.visibility),
    })),
    education: profile.education.map((entry) => ({
      ...timestampRecord(entry.id, timestamp),
      school: entry.school,
      degree: entry.degree,
      field: entry.field,
      location: entry.location,
      dateRange: {
        start: entry.startDate,
        end: entry.endDate || null,
        isCurrent: !entry.endDate,
      },
      notes: entry.notes
        ? [
            toRepositoryFact(
              `${entry.id}_note_1`,
              entry.notes,
              entry.visibility,
              ["education"],
            ),
          ]
        : [],
      visibility: visibilityToRepository(entry.visibility),
    })),
    skillGroups: profile.skills.map((entry) => ({
      ...timestampRecord(entry.id, timestamp),
      category: entry.category,
      skills: entry.skills.map((skillName, index) => ({
        ...timestampRecord(`${entry.id}_skill_${index + 1}`, timestamp),
        name: skillName,
        proficiency: "working",
        context: entry.context,
        relatedFactIds: entry.relatedFactIds,
        visibility: visibilityToRepository(entry.visibility),
      })),
      visibility: visibilityToRepository(entry.visibility),
    })),
    optionalSections: profile.optionalSections.map((entry) => ({
      ...timestampRecord(entry.id, timestamp),
      kind: optionalKindToRepository(entry.type),
      title: entry.type || "Custom",
      items: [
        {
          ...timestampRecord(`${entry.id}_item`, timestamp),
          title: entry.title,
          subtitle: entry.organization,
          location: "",
          dateRange: {
            start: entry.date,
            end: null,
            isCurrent: false,
          },
          links: [],
          description: entry.description,
          bulletFacts: entry.bullets.map((bullet, index) =>
            toRepositoryFact(
              `${entry.id}_fact_${index + 1}`,
              bullet,
              entry.visibility,
            ),
          ),
          visibility: visibilityToRepository(entry.visibility),
        },
      ],
      visibility: visibilityToRepository(entry.visibility),
    })),
    privacy: profile.privacy,
  };
};

export const isProfileEmpty = (profile: ResumeProfile) => {
  const basicsEmpty =
    !profile.basics.fullName.trim() &&
    !profile.basics.headline.trim() &&
    !profile.basics.email.trim() &&
    !profile.basics.summary.trim();

  return (
    basicsEmpty &&
    profile.experience.length === 0 &&
    profile.projects.length === 0 &&
    profile.education.length === 0 &&
    profile.skills.length === 0 &&
    profile.optionalSections.length === 0
  );
};

export const countVisibility = (profile: ResumeProfile) => {
  const counts: Record<VisibilityStatus, number> = {
    eligible: 0,
    private: 0,
    excluded: 0,
  };

  const add = (visibility: VisibilityStatus) => {
    counts[visibility] += 1;
  };

  add(profile.basics.visibility);
  profile.basics.links.forEach((item) => add(item.visibility));
  profile.experience.forEach((item) => add(item.visibility));
  profile.projects.forEach((item) => add(item.visibility));
  profile.education.forEach((item) => add(item.visibility));
  profile.skills.forEach((item) => add(item.visibility));
  profile.optionalSections.forEach((item) => add(item.visibility));

  return counts;
};
