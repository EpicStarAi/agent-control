// AI Agent Workspace — Planner (Phase 1-3).
// Turns a free-form task into: analysis -> plan -> clarifying questions -> execution tree.
// IMPORTANT: this module never performs real Telegram writes. "Automated" steps only run the
// existing SAFE prepare_* stubs from operatorActions.ts (local envelope, no TDLib call). Any step
// that would require a real mutating action (actually creating a channel, sending, inviting, etc.)
// is marked kind:"manual" and is reported as NOT done — we never fake success. This keeps the
// existing MANUAL_ONLY / approval-gate safety model intact while adding planning + progress UI.

export type StepStatus = "pending" | "running" | "done" | "blocked";
export type StepKind = "automated" | "manual";

export interface PlanStep {
  id: string;
  label: string;
  kind: StepKind;
  status: StepStatus;
  note?: string;
}

export interface ClarifyQuestion {
  id: string;
  text: string;
}

export interface TaskPlan {
  id: string;
  task: string;
  taskType: "channel_creation" | "unsupported_complex";
  questions: ClarifyQuestion[];
  answers: Record<string, string>;
  steps: PlanStep[];
  createdAt: string;
}

const rid = (p: string) => p + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);

// Verbs that signal a multi-step creation/build task rather than a one-shot navigation command.
const CREATION_VERBS = ["созда", "сдела", "настрой", "запусти", "построй", "разверни", "організ", "зроби"];

const CHANNEL_WORDS = ["канал"];
const OTHER_COMPLEX_WORDS = ["сеть каналов", "группу", "бота", "рассылку", "публикацию", "пост"];

export type TaskClassification =
  | { kind: "not_complex" }
  | { kind: "channel_creation" }
  | { kind: "unsupported_complex"; hint: string };

export function classifyTask(raw: string): TaskClassification {
  const s = raw.toLowerCase();
  const looksLikeCreation = CREATION_VERBS.some((v) => s.includes(v));
  if (!looksLikeCreation) return { kind: "not_complex" };
  if (CHANNEL_WORDS.some((w) => s.includes(w)) && !s.includes("каналов")) return { kind: "channel_creation" };
  const hint = OTHER_COMPLEX_WORDS.find((w) => s.includes(w)) || (s.includes("каналов") ? "сеть каналов" : "");
  if (hint) return { kind: "unsupported_complex", hint };
  return { kind: "not_complex" };
}

// Try to pre-fill answers from the original phrasing so we don't ask questions we can already answer.
function prefillFromText(raw: string): Record<string, string> {
  const s = raw.toLowerCase();
  const out: Record<string, string> = {};
  const topicMatch = raw.match(/про\s+([a-zа-яёіїєґ0-9 ]{2,40})$/i) || raw.match(/about\s+([a-z0-9 ]{2,40})$/i);
  if (topicMatch) out.topic = topicMatch[1].trim();
  if (s.includes("публичн") || s.includes("public")) out.visibility = "публичный";
  if (s.includes("приватн") || s.includes("private") || s.includes("закрыт")) out.visibility = "приватный";
  if (s.includes("на русском") || s.includes("рус.")) out.language = "русский";
  if (s.includes("на английском") || s.includes("english")) out.language = "английский";
  if (s.includes("на украинском") || s.includes("укр")) out.language = "украинский";
  return out;
}

export function buildChannelCreationPlan(rawTask: string): TaskPlan {
  const answers = prefillFromText(rawTask);
  const allQuestions: ClarifyQuestion[] = [
    { id: "name", text: "Как назвать канал?" },
    { id: "visibility", text: "Он публичный или приватный?" },
    { id: "language", text: "Какой язык контента?" },
    { id: "topic", text: "Какая тематика/о чём канал?" },
  ];
  const questions = allQuestions.filter((q) => !answers[q.id]);
  return {
    id: rid("plan"),
    task: rawTask,
    taskType: "channel_creation",
    questions,
    answers,
    steps: [], // filled in once all questions are answered, see buildStepsForChannelPlan
    createdAt: new Date().toISOString(),
  };
}

export function buildStepsForChannelPlan(answers: Record<string, string>): PlanStep[] {
  const title = answers.name ? `«${answers.name}»` : "канала";
  return [
    { id: "step_name", label: `Название: ${answers.name || "—"}`, kind: "automated", status: "pending" },
    { id: "step_desc", label: "Составить описание канала", kind: "automated", status: "pending" },
    { id: "step_avatar", label: "Подготовить концепцию аватара", kind: "automated", status: "pending" },
    { id: "step_plan", label: `Подготовить план создания канала ${title} (SAFE prepare, без записи в Telegram)`, kind: "automated", status: "pending" },
    { id: "step_create", label: "Создать канал в Telegram (реальная запись)", kind: "manual", status: "pending", note: "Требует ручного действия: инструмент реального создания канала ещё не подключён (HIGH-RISK, заблокирован в approval-gate)." },
    { id: "step_publisher", label: "Добавить канал в Publisher и расписание", kind: "manual", status: "pending", note: "Доступно вручную из раздела Publisher после того, как канал будет создан." },
  ];
}

export function questionsAnswered(plan: TaskPlan): boolean {
  return plan.questions.every((q) => !!plan.answers[q.id]);
}
