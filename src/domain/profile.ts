export const PROFILE_SCHEMA_VERSION = 1 as const;

export type ISODateString = string;

/**
 * generation-eligible: available to resume generation after user approval.
 * private: kept in the local vault and excluded from generated output/AI context.
 * excluded: truthful but intentionally unavailable for generation by default.
 */
export type VisibilityStatus =
  | "generation-eligible"
  | "private"
  | "excluded";

export type SkillProficiency =
  | "learning"
  | "working"
  | "advanced"
  | "expert";

export type OptionalSectionKind =
  | "certifications"
  | "awards"
  | "publications"
  | "volunteer"
  | "custom";

export interface TimestampedRecord {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DateRange {
  start: string;
  end: string | null;
  isCurrent: boolean;
}

export interface ProfileLink extends TimestampedRecord {
  label: string;
  url: string;
  visibility: VisibilityStatus;
}

export interface ProfileFact extends TimestampedRecord {
  text: string;
  visibility: VisibilityStatus;
  tags: string[];
}

export interface ProfileBasicsVisibility {
  fullName: VisibilityStatus;
  headline: VisibilityStatus;
  location: VisibilityStatus;
  email: VisibilityStatus;
  phone: VisibilityStatus;
  summary: VisibilityStatus;
}

export interface ProfileBasics extends TimestampedRecord {
  fullName: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  links: ProfileLink[];
  summary: string;
  visibility: ProfileBasicsVisibility;
}

export interface WorkExperience extends TimestampedRecord {
  company: string;
  role: string;
  location: string;
  dateRange: DateRange;
  description: string;
  bulletFacts: ProfileFact[];
  visibility: VisibilityStatus;
}

export interface Project extends TimestampedRecord {
  title: string;
  links: ProfileLink[];
  dateRange: DateRange;
  technologies: string[];
  description: string;
  bulletFacts: ProfileFact[];
  visibility: VisibilityStatus;
}

export interface Education extends TimestampedRecord {
  school: string;
  degree: string;
  field: string;
  location: string;
  dateRange: DateRange;
  notes: ProfileFact[];
  visibility: VisibilityStatus;
}

export interface Skill extends TimestampedRecord {
  name: string;
  proficiency: SkillProficiency;
  context: string;
  relatedFactIds: string[];
  visibility: VisibilityStatus;
}

export interface SkillGroup extends TimestampedRecord {
  category: string;
  skills: Skill[];
  visibility: VisibilityStatus;
}

export interface OptionalSectionItem extends TimestampedRecord {
  title: string;
  subtitle: string;
  location: string;
  dateRange: DateRange;
  links: ProfileLink[];
  description: string;
  bulletFacts: ProfileFact[];
  visibility: VisibilityStatus;
}

export interface OptionalSection extends TimestampedRecord {
  kind: OptionalSectionKind;
  title: string;
  items: OptionalSectionItem[];
  visibility: VisibilityStatus;
}

export interface ResumeProfile extends TimestampedRecord {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  basics: ProfileBasics;
  workExperiences: WorkExperience[];
  projects: Project[];
  education: Education[];
  skillGroups: SkillGroup[];
  optionalSections: OptionalSection[];
}

const SAMPLE_TIMESTAMP = "2026-05-14T00:00:00.000Z";
const GENERATION_ELIGIBLE: VisibilityStatus = "generation-eligible";

export function createEmptyProfile(
  timestamp: ISODateString = new Date().toISOString(),
): ResumeProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: createId("profile"),
    createdAt: timestamp,
    updatedAt: timestamp,
    basics: {
      id: createId("basics"),
      createdAt: timestamp,
      updatedAt: timestamp,
      fullName: "",
      headline: "",
      location: "",
      email: "",
      phone: "",
      links: [],
      summary: "",
      visibility: {
        fullName: GENERATION_ELIGIBLE,
        headline: GENERATION_ELIGIBLE,
        location: GENERATION_ELIGIBLE,
        email: GENERATION_ELIGIBLE,
        phone: "private",
        summary: GENERATION_ELIGIBLE,
      },
    },
    workExperiences: [],
    projects: [],
    education: [],
    skillGroups: [],
    optionalSections: [],
  };
}

export function createSampleProfile(): ResumeProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: "profile_sample",
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    basics: {
      id: "basics_sample",
      createdAt: SAMPLE_TIMESTAMP,
      updatedAt: SAMPLE_TIMESTAMP,
      fullName: "Alex Morgan",
      headline: "Local-first product engineer",
      location: "New York, NY",
      email: "alex.morgan@example.com",
      phone: "+1 555 010 2030",
      links: [
        link("link_portfolio", "Portfolio", "https://example.com/alex"),
        link("link_github", "GitHub", "https://github.com/alexmorgan"),
      ],
      summary:
        "Product-minded engineer focused on privacy-preserving tools, structured data, and polished local workflows.",
      visibility: {
        fullName: GENERATION_ELIGIBLE,
        headline: GENERATION_ELIGIBLE,
        location: GENERATION_ELIGIBLE,
        email: GENERATION_ELIGIBLE,
        phone: "private",
        summary: GENERATION_ELIGIBLE,
      },
    },
    workExperiences: [
      {
        id: "work_northstar",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        company: "Northstar Analytics",
        role: "Senior Product Engineer",
        location: "Remote",
        dateRange: {
          start: "2022-08",
          end: null,
          isCurrent: true,
        },
        description:
          "Builds local-first analytics workflows for privacy-sensitive operations teams.",
        bulletFacts: [
          fact(
            "fact_work_northstar_1",
            "Led a React and TypeScript migration that reduced dashboard load time by 38%.",
            ["react", "typescript", "performance"],
          ),
          fact(
            "fact_work_northstar_2",
            "Designed a SQLite-backed offline queue for field teams working without reliable network access.",
            ["sqlite", "offline", "local-first"],
          ),
          fact(
            "fact_work_northstar_private",
            "Maintained internal customer notes that should stay out of generated resumes.",
            ["internal"],
            "private",
          ),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
      {
        id: "work_civicflow",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        company: "CivicFlow",
        role: "Software Engineer",
        location: "Brooklyn, NY",
        dateRange: {
          start: "2019-06",
          end: "2022-07",
          isCurrent: false,
        },
        description:
          "Built workflow software for public-sector case management teams.",
        bulletFacts: [
          fact(
            "fact_work_civicflow_1",
            "Shipped an audit trail system that made profile edits traceable across support workflows.",
            ["audit", "data-modeling"],
          ),
          fact(
            "fact_work_civicflow_excluded",
            "Owned a legacy Backbone view that is no longer relevant to target roles.",
            ["legacy"],
            "excluded",
          ),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
    ],
    projects: [
      {
        id: "project_resumelab",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        title: "ResumeLab Prototype",
        links: [
          link(
            "link_project_resumelab",
            "Case study",
            "https://example.com/resumelab",
          ),
        ],
        dateRange: {
          start: "2026-02",
          end: null,
          isCurrent: true,
        },
        technologies: ["React", "TypeScript", "Electron", "SQLite"],
        description:
          "A local-first resume editor that keeps factual profile data separate from generated resume drafts.",
        bulletFacts: [
          fact(
            "fact_project_resumelab_1",
            "Modeled resume facts with stable IDs so generated drafts can cite their source records.",
            ["data-modeling", "resume"],
          ),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
    ],
    education: [
      {
        id: "education_state",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        school: "State University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        location: "Albany, NY",
        dateRange: {
          start: "2015-09",
          end: "2019-05",
          isCurrent: false,
        },
        notes: [
          fact(
            "fact_education_state_1",
            "Completed coursework in databases, distributed systems, and human-computer interaction.",
            ["education"],
          ),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
    ],
    skillGroups: [
      {
        id: "skill_group_frontend",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        category: "Frontend",
        skills: [
          skill("skill_react", "React", "expert", [
            "fact_work_northstar_1",
            "fact_project_resumelab_1",
          ]),
          skill("skill_typescript", "TypeScript", "advanced", [
            "fact_work_northstar_1",
          ]),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
      {
        id: "skill_group_data",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        category: "Data and Storage",
        skills: [
          skill("skill_sqlite", "SQLite", "advanced", [
            "fact_work_northstar_2",
          ]),
        ],
        visibility: GENERATION_ELIGIBLE,
      },
    ],
    optionalSections: [
      {
        id: "optional_certifications",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        kind: "certifications",
        title: "Certifications",
        items: [
          {
            id: "cert_privacy_engineering",
            createdAt: SAMPLE_TIMESTAMP,
            updatedAt: SAMPLE_TIMESTAMP,
            title: "Privacy Engineering Certificate",
            subtitle: "Example Institute",
            location: "Online",
            dateRange: {
              start: "2024-04",
              end: null,
              isCurrent: false,
            },
            links: [],
            description:
              "Focused on privacy reviews, data minimization, and secure local data handling.",
            bulletFacts: [
              fact(
                "fact_cert_privacy_1",
                "Completed a capstone on reducing unnecessary personal-data egress from desktop apps.",
                ["privacy", "local-first"],
              ),
            ],
            visibility: GENERATION_ELIGIBLE,
          },
        ],
        visibility: GENERATION_ELIGIBLE,
      },
    ],
  };
}

export function isResumeProfile(value: unknown): value is ResumeProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === PROFILE_SCHEMA_VERSION &&
    isTimestampedRecord(value) &&
    isProfileBasics(value.basics) &&
    isArrayOf(value.workExperiences, isWorkExperience) &&
    isArrayOf(value.projects, isProject) &&
    isArrayOf(value.education, isEducation) &&
    isArrayOf(value.skillGroups, isSkillGroup) &&
    isArrayOf(value.optionalSections, isOptionalSection)
  );
}

export function isVisibilityStatus(
  value: unknown,
): value is VisibilityStatus {
  return (
    value === "generation-eligible" ||
    value === "private" ||
    value === "excluded"
  );
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function link(
  id: string,
  label: string,
  url: string,
  visibility: VisibilityStatus = GENERATION_ELIGIBLE,
): ProfileLink {
  return {
    id,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    label,
    url,
    visibility,
  };
}

function fact(
  id: string,
  text: string,
  tags: string[],
  visibility: VisibilityStatus = GENERATION_ELIGIBLE,
): ProfileFact {
  return {
    id,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    text,
    visibility,
    tags,
  };
}

function skill(
  id: string,
  name: string,
  proficiency: SkillProficiency,
  relatedFactIds: string[],
  visibility: VisibilityStatus = GENERATION_ELIGIBLE,
): Skill {
  return {
    id,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    name,
    proficiency,
    context: "",
    relatedFactIds,
    visibility,
  };
}

function isProfileBasics(value: unknown): value is ProfileBasics {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.fullName) &&
    isString(value.headline) &&
    isString(value.location) &&
    isString(value.email) &&
    isString(value.phone) &&
    isArrayOf(value.links, isProfileLink) &&
    isString(value.summary) &&
    isProfileBasicsVisibility(value.visibility)
  );
}

function isProfileBasicsVisibility(
  value: unknown,
): value is ProfileBasicsVisibility {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isVisibilityStatus(value.fullName) &&
    isVisibilityStatus(value.headline) &&
    isVisibilityStatus(value.location) &&
    isVisibilityStatus(value.email) &&
    isVisibilityStatus(value.phone) &&
    isVisibilityStatus(value.summary)
  );
}

function isWorkExperience(value: unknown): value is WorkExperience {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.company) &&
    isString(value.role) &&
    isString(value.location) &&
    isDateRange(value.dateRange) &&
    isString(value.description) &&
    isArrayOf(value.bulletFacts, isProfileFact) &&
    isVisibilityStatus(value.visibility)
  );
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.title) &&
    isArrayOf(value.links, isProfileLink) &&
    isDateRange(value.dateRange) &&
    isArrayOf(value.technologies, isString) &&
    isString(value.description) &&
    isArrayOf(value.bulletFacts, isProfileFact) &&
    isVisibilityStatus(value.visibility)
  );
}

function isEducation(value: unknown): value is Education {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.school) &&
    isString(value.degree) &&
    isString(value.field) &&
    isString(value.location) &&
    isDateRange(value.dateRange) &&
    isArrayOf(value.notes, isProfileFact) &&
    isVisibilityStatus(value.visibility)
  );
}

function isSkillGroup(value: unknown): value is SkillGroup {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.category) &&
    isArrayOf(value.skills, isSkill) &&
    isVisibilityStatus(value.visibility)
  );
}

function isSkill(value: unknown): value is Skill {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.name) &&
    isSkillProficiency(value.proficiency) &&
    isString(value.context) &&
    isArrayOf(value.relatedFactIds, isString) &&
    isVisibilityStatus(value.visibility)
  );
}

function isOptionalSection(value: unknown): value is OptionalSection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isOptionalSectionKind(value.kind) &&
    isString(value.title) &&
    isArrayOf(value.items, isOptionalSectionItem) &&
    isVisibilityStatus(value.visibility)
  );
}

function isOptionalSectionItem(value: unknown): value is OptionalSectionItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.title) &&
    isString(value.subtitle) &&
    isString(value.location) &&
    isDateRange(value.dateRange) &&
    isArrayOf(value.links, isProfileLink) &&
    isString(value.description) &&
    isArrayOf(value.bulletFacts, isProfileFact) &&
    isVisibilityStatus(value.visibility)
  );
}

function isProfileLink(value: unknown): value is ProfileLink {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.label) &&
    isString(value.url) &&
    isVisibilityStatus(value.visibility)
  );
}

function isProfileFact(value: unknown): value is ProfileFact {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.text) &&
    isVisibilityStatus(value.visibility) &&
    isArrayOf(value.tags, isString)
  );
}

function isDateRange(value: unknown): value is DateRange {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.start) &&
    (isString(value.end) || value.end === null) &&
    typeof value.isCurrent === "boolean"
  );
}

function isSkillProficiency(value: unknown): value is SkillProficiency {
  return (
    value === "learning" ||
    value === "working" ||
    value === "advanced" ||
    value === "expert"
  );
}

function isOptionalSectionKind(value: unknown): value is OptionalSectionKind {
  return (
    value === "certifications" ||
    value === "awards" ||
    value === "publications" ||
    value === "volunteer" ||
    value === "custom"
  );
}

function isTimestampedRecord(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(predicate);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
