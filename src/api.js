// ---------------------------------------------------------------------------
// Strat unic de acces la date (Turso). Toate interogările SQL ale aplicației
// trec prin acest fișier => ușor de auditat / optimizat / limitat.
// Întrebările NU sunt în Turso (sunt în data/questions/*.json, împachetate în
// build), ca să nu consumăm din limita de citiri (500M rows) pe cele ~2000
// de întrebări. În DB ținem doar: concurenți, prezențe, note, progres
// capitole, id-urile întrebărilor deja folosite și evenimentele de
// indisciplină.
// ---------------------------------------------------------------------------
import { db } from './db.js';

// ---------- Concurenți -------------------------------------------------

export const CATEGORIES = ['P-1', '2-3', '4-5', '6-7', '8-9', '10-11', '18-45', '45+'];

export async function listCompetitors() {
  const rs = await db.execute('SELECT id, first_name, last_name, category FROM competitors ORDER BY last_name, first_name');
  return rs.rows;
}

export async function addCompetitor({ firstName, lastName, category }) {
  await db.execute({
    sql: 'INSERT INTO competitors (first_name, last_name, category) VALUES (?, ?, ?)',
    args: [firstName, lastName, category],
  });
}

export async function deleteCompetitor(id) {
  await db.execute({ sql: 'DELETE FROM competitors WHERE id = ?', args: [id] });
}

// ---------- Prezență ----------------------------------------------------

// Întoarce, într-un singur apel: lista sesiunilor (date) + toate prezențele.
export async function getAttendanceOverview() {
  const [sessions, records] = await db.batch([
    'SELECT id, session_date FROM attendance_sessions ORDER BY session_date',
    'SELECT session_id, competitor_id, present FROM attendance_records',
  ], 'read');
  return { sessions: sessions.rows, records: records.rows };
}

export async function getOrCreateSession(dateStr) {
  const existing = await db.execute({
    sql: 'SELECT id FROM attendance_sessions WHERE session_date = ?',
    args: [dateStr],
  });
  if (existing.rows.length) return existing.rows[0].id;
  const res = await db.execute({
    sql: 'INSERT INTO attendance_sessions (session_date) VALUES (?)',
    args: [dateStr],
  });
  return Number(res.lastInsertRowid);
}

// Salvează prezența unei întregi sesiuni dintr-o dată (un singur batch, nu un write per copil).
export async function saveAttendance(sessionId, presenceMap) {
  const statements = Object.entries(presenceMap).map(([competitorId, present]) => ({
    sql: `INSERT INTO attendance_records (session_id, competitor_id, present)
          VALUES (?, ?, ?)
          ON CONFLICT(session_id, competitor_id) DO UPDATE SET present = excluded.present`,
    args: [sessionId, Number(competitorId), present ? 1 : 0],
  }));
  if (statements.length === 0) return;
  await db.batch(statements, 'write');
}

// ---------- Note ---------------------------------------------------------

export async function listGrades() {
  const rs = await db.execute('SELECT id, competitor_id, grade_date, score FROM grades ORDER BY grade_date');
  return rs.rows;
}

export async function addGrade({ competitorId, date, score }) {
  await db.execute({
    sql: 'INSERT INTO grades (competitor_id, grade_date, score) VALUES (?, ?, ?)',
    args: [competitorId, date, score],
  });
}

export async function deleteGrade(id) {
  await db.execute({ sql: 'DELETE FROM grades WHERE id = ?', args: [id] });
}

// ---------- Progres capitole (global, pentru toți concurenții) -----------

// BOOK: '1SAM' | '2SAM'
export async function getChaptersProgress() {
  const rs = await db.execute('SELECT book, chapter, completed FROM chapters_progress');
  const set = new Set();
  for (const r of rs.rows) {
    if (Number(r.completed) === 1) set.add(`${r.book}-${r.chapter}`);
  }
  return set; // Set<"1SAM-3">
}

export async function toggleChapter(book, chapter, completed) {
  await db.execute({
    sql: `INSERT INTO chapters_progress (book, chapter, completed) VALUES (?, ?, ?)
          ON CONFLICT(book, chapter) DO UPDATE SET completed = excluded.completed`,
    args: [book, chapter, completed ? 1 : 0],
  });
}

// ---------- Întrebări folosite (pool comun quiz + indisciplină) ----------

export async function getUsedQuestionIds() {
  const rs = await db.execute('SELECT question_id FROM used_questions');
  return new Set(rs.rows.map((r) => r.question_id));
}

export async function markQuestionsUsed(questionIds, context) {
  if (!questionIds.length) return;
  const statements = questionIds.map((qid) => ({
    sql: 'INSERT OR IGNORE INTO used_questions (question_id, context) VALUES (?, ?)',
    args: [qid, context],
  }));
  await db.batch(statements, 'write');
}

export async function resetUsedQuestions() {
  await db.execute('DELETE FROM used_questions');
}

// ---------- Indisciplină --------------------------------------------------

export async function createDisciplineEvent({ competitorId, date }) {
  const res = await db.execute({
    sql: 'INSERT INTO discipline_events (competitor_id, event_date) VALUES (?, ?)',
    args: [competitorId, date],
  });
  return Number(res.lastInsertRowid);
}

// Salvează rezultatul final al celor 3 întrebări + cartonașul, într-un singur batch.
export async function finalizeDisciplineEvent(eventId, answers, card) {
  // answers: [{ questionId, isCorrect }]
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const statements = [
    {
      sql: 'UPDATE discipline_events SET correct_count = ?, card = ? WHERE id = ?',
      args: [correctCount, card, eventId],
    },
    ...answers.map((a) => ({
      sql: 'INSERT INTO discipline_questions (discipline_event_id, question_id, is_correct) VALUES (?, ?, ?)',
      args: [eventId, a.questionId, a.isCorrect ? 1 : 0],
    })),
  ];
  await db.batch(statements, 'write');
}

// Un singur apel citește tot ce trebuie pentru raportul de indisciplină.
export async function getDisciplineReport() {
  const rs = await db.execute(`
    SELECT c.id as competitor_id, c.first_name, c.last_name, c.category,
           de.card
    FROM competitors c
    LEFT JOIN discipline_events de ON de.competitor_id = c.id AND de.card IS NOT NULL
  `);
  const map = new Map();
  for (const r of rs.rows) {
    const key = r.competitor_id;
    if (!map.has(key)) {
      map.set(key, {
        competitorId: key,
        firstName: r.first_name,
        lastName: r.last_name,
        category: r.category,
        red: 0,
        yellow: 0,
      });
    }
    if (r.card === 'rosu') map.get(key).red += 1;
    if (r.card === 'galben') map.get(key).yellow += 1;
  }
  return Array.from(map.values()).map((row) => ({ ...row, total: row.red + row.yellow }));
}
