import './styles.css';
import { registerRoute, startRouter } from './router.js';
import { renderCompetitors } from './pages/competitors.js';
import { renderAttendance } from './pages/attendance.js';
import { renderGrades } from './pages/grades.js';
import { renderChapters } from './pages/chapters.js';
import { renderQuiz } from './pages/quiz.js';
import { renderDiscipline } from './pages/discipline.js';
import { renderDisciplineReport } from './pages/discipline-report.js';

registerRoute('concurenti', renderCompetitors);
registerRoute('prezenta', renderAttendance);
registerRoute('note', renderGrades);
registerRoute('capitole', renderChapters);
registerRoute('quiz', renderQuiz);
registerRoute('indisciplina', renderDiscipline);
registerRoute('raport-indisciplina', renderDisciplineReport);

startRouter();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
