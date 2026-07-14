/**
 * Feedback Management SPA.
 *
 * Hash routing keeps every view deep-linkable without a server-side fallback.
 * Each route declares the roles allowed to reach it; the nav is built from the
 * same table, so a user never sees a link that would 403.
 */

import { api, auth, ApiError, onUnauthorized } from './api.js';
import {
  icon, escapeHtml, fmt, toast, openModal, confirmDialog, setBusy,
  clearFieldErrors, showFormError, emptyState, errorState, skeletonRows,
  ratingDisplay, statCard,
} from './ui.js';
import { ratingDistributionChart, horizontalBarChart, donutChart, legend } from './charts.js';

const ADMIN = 'ADMIN';
const COORDINATOR = 'COORDINATOR';
const PARTICIPANT = 'PARTICIPANT';

const main = () => document.getElementById('main');

/* ============================================================
   Routes
   ============================================================ */
const ROUTES = {
  '/dashboard':        { title: 'Dashboard',          icon: 'dashboard',  roles: [ADMIN, COORDINATOR, PARTICIPANT], render: renderDashboard,      section: 'Overview' },
  '/courses':          { title: 'Courses',            icon: 'book',       roles: [ADMIN, COORDINATOR, PARTICIPANT], render: renderCourses,        section: 'Manage' },
  '/programs':         { title: 'Training Programs',  icon: 'program',    roles: [ADMIN, COORDINATOR, PARTICIPANT], render: renderPrograms,       section: 'Manage' },
  '/faculty':          { title: 'Faculty',            icon: 'users',      roles: [ADMIN],                           render: renderFaculty,        section: 'Manage' },
  '/submit-feedback':  { title: 'Submit Feedback',    icon: 'message',    roles: [PARTICIPANT],                     render: renderSubmitFeedback, section: 'Feedback' },
  '/my-feedback':      { title: 'My Feedback',        icon: 'clipboard',  roles: [PARTICIPANT],                     render: renderMyFeedback,     section: 'Feedback' },
  '/feedback-reports': { title: 'Feedback Reports',   icon: 'clipboard',  roles: [ADMIN, COORDINATOR],              render: renderFeedbackReports, section: 'Reports' },
  '/defaulters':       { title: 'Defaulters',         icon: 'alert',      roles: [ADMIN, COORDINATOR],              render: renderDefaulters,     section: 'Reports' },
  '/summary':          { title: 'Training Summary',   icon: 'trending',   roles: [ADMIN],                           render: renderTrainingSummary, section: 'Reports' },
  '/analytics':        { title: 'Course Analytics',   icon: 'chart',      roles: [ADMIN],                           render: renderCourseAnalytics, section: 'Reports' },
};

const homeFor = (role) => (role === PARTICIPANT ? '/dashboard' : '/dashboard');

/* ============================================================
   Boot
   ============================================================ */
initTheme();
wireAuthScreen();
wireShell();
onUnauthorized.handler = () => {
  showAuthScreen();
  toast('Your session expired. Please sign in again.', 'error');
};

window.addEventListener('hashchange', route);
start();

async function start() {
  if (!auth.isAuthenticated) {
    showAuthScreen();
    return;
  }
  try {
    // Confirms the stored token still works and gives us the user's id.
    const me = await api.me();
    auth.saveProfile(me);
    showAppShell();
  } catch (error) {
    if (error.status !== 401) {
      auth.clear();
      showAuthScreen();
      toast(error.message, 'error');
    }
  }
}

/* ============================================================
   Auth screen
   ============================================================ */
function showAuthScreen() {
  document.getElementById('app-shell').hidden = true;
  const screen = document.getElementById('auth-screen');
  screen.hidden = false;
  document.getElementById('login-email')?.focus();
}

function showAppShell() {
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-shell').hidden = false;
  renderUserChip();
  renderNav();
  route();
}

function wireAuthScreen() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');

  const select = (loginActive) => {
    tabLogin.classList.toggle('active', loginActive);
    tabRegister.classList.toggle('active', !loginActive);
    tabLogin.setAttribute('aria-selected', String(loginActive));
    tabRegister.setAttribute('aria-selected', String(!loginActive));
    panelLogin.hidden = !loginActive;
    panelRegister.hidden = loginActive;
  };
  tabLogin.addEventListener('click', () => select(true));
  tabRegister.addEventListener('click', () => select(false));

  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.innerHTML = icon('eye');
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.toggle);
      const revealed = input.type === 'text';
      input.type = revealed ? 'password' : 'text';
      button.innerHTML = icon(revealed ? 'eye' : 'eyeOff');
      button.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
    });
  });

  panelLogin.addEventListener('submit', (event) =>
    submitAuth(event, () =>
      api.login({
        email: panelLogin.querySelector('#login-email').value.trim(),
        password: panelLogin.querySelector('#login-password').value,
      })
    )
  );

  panelRegister.addEventListener('submit', (event) =>
    submitAuth(event, () =>
      api.register({
        username: panelRegister.querySelector('#reg-username').value.trim(),
        email: panelRegister.querySelector('#reg-email').value.trim(),
        password: panelRegister.querySelector('#reg-password').value,
        role: panelRegister.querySelector('#reg-role').value,
      })
    )
  );
}

async function submitAuth(event, action) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  clearFieldErrors(form);
  setBusy(button, true, 'Signing in…');
  try {
    const authResponse = await action();
    auth.save(authResponse);
    const me = await api.me();
    auth.saveProfile(me);
    location.hash = homeFor(me.role);
    showAppShell();
    toast(`Signed in as ${me.username}`, 'success');
  } catch (error) {
    // Auth fields use `id` rather than `name` mapping in some cases; map by suffix.
    if (error.fieldErrors) {
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        const slot = form.querySelector(`[data-error-for$="${field}"]`);
        const input = form.querySelector(`[name="${field}"]`);
        if (slot) slot.textContent = message;
        input?.setAttribute('aria-invalid', 'true');
      }
    } else {
      showFormError(form, error);
    }
    toast(error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

/* ============================================================
   Shell: nav, theme, logout
   ============================================================ */
function wireShell() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const navToggle = document.getElementById('nav-toggle');
  navToggle.innerHTML = icon('menu');

  const setNav = (open) => {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  navToggle.addEventListener('click', () => setNav(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setNav(false));
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('.nav-link')) setNav(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) setNav(false);
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    auth.clear();
    location.hash = '';
    showAuthScreen();
    toast('Signed out.', 'success');
  });

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function initTheme() {
  const stored = localStorage.getItem('fms.theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored ?? (prefersDark ? 'dark' : 'light'));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('fms.theme', next);
  applyTheme(next);
}

function renderUserChip() {
  const user = auth.user;
  document.getElementById('user-avatar').textContent = fmt.initials(user.username ?? user.email);
  document.getElementById('user-name').textContent = user.username ?? user.email;
  document.getElementById('user-role').textContent = user.role;
}

function renderNav() {
  const role = auth.user.role;
  const list = document.getElementById('nav-list');
  const allowed = Object.entries(ROUTES).filter(([, config]) => config.roles.includes(role));

  let currentSection = null;
  list.innerHTML = allowed
    .map(([path, config]) => {
      const header =
        config.section !== currentSection
          ? `<li class="nav-section" aria-hidden="true">${escapeHtml((currentSection = config.section))}</li>`
          : '';
      return `${header}
        <li>
          <a class="nav-link" href="#${path}" data-path="${path}">
            ${icon(config.icon, { size: 18 })}<span>${escapeHtml(config.title)}</span>
          </a>
        </li>`;
    })
    .join('');
}

function markActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.dataset.path === path) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/* ============================================================
   Router
   ============================================================ */
async function route() {
  if (!auth.isAuthenticated) return;

  const path = location.hash.replace(/^#/, '') || homeFor(auth.user.role);
  const config = ROUTES[path];

  if (!config) {
    main().innerHTML = emptyState({
      iconName: 'alert',
      title: 'Page not found',
      message: `No page matches "${path}".`,
      actionHtml: `<a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>`,
    });
    return;
  }

  if (!config.roles.includes(auth.user.role)) {
    main().innerHTML = emptyState({
      iconName: 'alert',
      title: 'Not available for your role',
      message: `"${config.title}" is restricted to ${config.roles.join(' and ')} users. You are signed in as ${auth.user.role}.`,
      actionHtml: `<a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>`,
    });
    return;
  }

  markActiveNav(path);
  document.title = `${config.title} · Feedback Management`;
  main().innerHTML = `<div class="card">${skeletonRows(4)}</div>`;

  try {
    await config.render();
    main().focus();
  } catch (error) {
    if (error.status === 401) return; // handled by onUnauthorized
    main().innerHTML = `<div class="card">${errorState(error, 'retry')}</div>`;
    main().querySelector('[data-action="retry"]')?.addEventListener('click', route);
  }
}

const reload = () => route();

function pageHead(title, description, actionsHtml = '') {
  return `
    <div class="page-head">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </div>
      ${actionsHtml ? `<div class="page-head-actions">${actionsHtml}</div>` : ''}
    </div>`;
}

/* ============================================================
   Dashboard
   ============================================================ */
async function renderDashboard() {
  const role = auth.user.role;
  if (role === ADMIN) return renderAdminDashboard();
  if (role === COORDINATOR) return renderCoordinatorDashboard();
  return renderParticipantDashboard();
}

async function renderAdminDashboard() {
  const [summaries, analytics, courses] = await Promise.all([
    api.trainingSummary(),
    api.courseAnalytics(),
    api.courses(),
  ]);

  const totalFeedback = analytics.reduce((sum, course) => sum + course.totalFeedback, 0);
  const rated = analytics.filter((course) => course.totalFeedback > 0);
  const overallAvg = rated.length
    ? rated.reduce((sum, course) => sum + course.averageRating * course.totalFeedback, 0) / totalFeedback
    : 0;
  const totalDefaulters = summaries.reduce((sum, program) => sum + program.defaulterCount, 0);
  const avgResponse = summaries.length
    ? summaries.reduce((sum, program) => sum + program.responseRate, 0) / summaries.length
    : 0;

  const chartItems = rated
    .slice()
    .sort((a, b) => b.averageRating - a.averageRating)
    .map((course) => ({ label: course.courseName, value: course.averageRating, note: `${course.totalFeedback} responses` }));

  main().innerHTML = `
    ${pageHead('Dashboard', `Programme health across ${courses.length} courses and ${summaries.length} training programs.`)}
    <div class="grid grid-stats" style="margin-bottom:24px">
      ${statCard({ label: 'Total feedback', value: fmt.number(totalFeedback), sub: 'across all courses', iconName: 'message' })}
      ${statCard({ label: 'Average rating', value: overallAvg ? overallAvg.toFixed(2) : '—', sub: 'weighted by responses', iconName: 'star' })}
      ${statCard({ label: 'Average response rate', value: fmt.percent(avgResponse), sub: 'across programs', iconName: 'trending' })}
      ${statCard({ label: 'Outstanding defaulters', value: fmt.number(totalDefaulters), sub: 'participants yet to respond', iconName: 'alert' })}
    </div>

    <div class="grid grid-2">
      <section class="card">
        <div class="card-head"><h2>Average rating by course</h2></div>
        <div class="card-body">
          ${chartItems.length
            ? horizontalBarChart(chartItems, { max: 5, summary: 'Average rating out of 5 by course' })
            : emptyState({ title: 'No ratings yet', message: 'Once participants submit feedback, course averages appear here.' })}
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Response rate by program</h2></div>
        <div class="card-body">
          ${summaries.length
            ? horizontalBarChart(
                summaries.map((program) => ({
                  label: program.programName,
                  value: program.responseRate,
                  note: `${program.respondentCount} of ${program.enrolledCount} enrolled`,
                })),
                { max: 100, unit: '%', summary: 'Feedback response rate by training program' }
              )
            : emptyState({ title: 'No programs yet', message: 'Create a training program to start tracking responses.' })}
        </div>
      </section>
    </div>`;
}

async function renderCoordinatorDashboard() {
  const [programs, feedback] = await Promise.all([api.programs(), api.allFeedback()]);
  const mine = programs.filter((program) => program.coordinatorId === auth.user.id);
  const scoped = mine.length ? mine : programs;

  const enrolled = scoped.reduce((sum, program) => sum + (program.participantIds?.length ?? 0), 0);
  const ratings = feedback.map((entry) => entry.rating);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  main().innerHTML = `
    ${pageHead('Dashboard', 'Programs you coordinate and the feedback they have attracted.')}
    <div class="grid grid-stats" style="margin-bottom:24px">
      ${statCard({ label: 'Training programs', value: scoped.length, sub: mine.length ? 'assigned to you' : 'all programs', iconName: 'program' })}
      ${statCard({ label: 'Enrolled participants', value: enrolled, sub: 'across those programs', iconName: 'users' })}
      ${statCard({ label: 'Feedback received', value: feedback.length, sub: 'total submissions', iconName: 'message' })}
      ${statCard({ label: 'Average rating', value: avg ? avg.toFixed(2) : '—', sub: 'across all feedback', iconName: 'star' })}
    </div>

    <section class="card">
      <div class="card-head"><h2>Your programs</h2></div>
      ${scoped.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Program</th><th>Status</th><th class="num">Enrolled</th><th>Ends</th><th class="actions">Defaulters</th></tr></thead>
            <tbody>${scoped
              .map(
                (program) => `
                <tr>
                  <td>${escapeHtml(program.programName)}</td>
                  <td>${statusBadge(program.status)}</td>
                  <td class="num">${program.participantIds?.length ?? 0} / ${program.maxParticipants}</td>
                  <td>${fmt.date(program.endDate)}</td>
                  <td class="actions"><a class="btn btn-secondary btn-sm" href="#/defaulters?program=${encodeURIComponent(program.id)}">View report</a></td>
                </tr>`
              )
              .join('')}</tbody></table></div>`
        : emptyState({ iconName: 'program', title: 'No programs yet', message: 'Create a training program to begin enrolling participants.' })}
    </section>`;
}

async function renderParticipantDashboard() {
  const [programs, myFeedback, courses] = await Promise.all([api.programs(), api.myFeedback(), api.courses()]);
  const enrolled = programs.filter((program) => program.participantIds?.includes(auth.user.id));

  // One feedback is expected per (program, course) pair for programs I am enrolled in.
  const submittedKeys = new Set(myFeedback.map((entry) => `${entry.trainingProgramId}:${entry.courseId}`));
  const pending = enrolled.length * courses.length - submittedKeys.size;
  const avg = myFeedback.length
    ? myFeedback.reduce((sum, entry) => sum + entry.rating, 0) / myFeedback.length
    : 0;

  main().innerHTML = `
    ${pageHead(`Welcome, ${auth.user.username ?? ''}`.trim(), 'Your enrolled programs and the feedback you have shared.')}
    <div class="grid grid-stats" style="margin-bottom:24px">
      ${statCard({ label: 'Enrolled programs', value: enrolled.length, sub: 'you can submit feedback for these', iconName: 'program' })}
      ${statCard({ label: 'Feedback submitted', value: myFeedback.length, sub: 'thank you', iconName: 'checkCircle' })}
      ${statCard({ label: 'Awaiting your feedback', value: Math.max(pending, 0), sub: 'course and program pairs', iconName: 'clipboard' })}
      ${statCard({ label: 'Your average rating', value: avg ? avg.toFixed(1) : '—', sub: 'across your submissions', iconName: 'star' })}
    </div>

    <section class="card">
      <div class="card-head">
        <h2>Your programs</h2>
        <a class="btn btn-primary btn-sm" href="#/submit-feedback" style="margin-left:auto">
          ${icon('plus', { size: 16 })} Submit feedback
        </a>
      </div>
      ${enrolled.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Program</th><th>Status</th><th>Starts</th><th>Ends</th></tr></thead>
            <tbody>${enrolled
              .map(
                (program) => `
                <tr>
                  <td>${escapeHtml(program.programName)}<div class="muted" style="font-size:.8125rem">${escapeHtml(program.description ?? '')}</div></td>
                  <td>${statusBadge(program.status)}</td>
                  <td>${fmt.date(program.startDate)}</td>
                  <td>${fmt.date(program.endDate)}</td>
                </tr>`
              )
              .join('')}</tbody></table></div>`
        : emptyState({
            iconName: 'program',
            title: 'You are not enrolled yet',
            message: 'A coordinator must enrol you in a training program before you can submit feedback.',
          })}
    </section>`;
}

function statusBadge(status) {
  const variant = status === 'COMPLETED' ? 'badge-success' : status === 'ONGOING' ? 'badge-info' : 'badge-warning';
  return `<span class="badge ${variant}">${escapeHtml(status ?? 'UNKNOWN')}</span>`;
}

/* ============================================================
   Courses
   ============================================================ */
async function renderCourses() {
  const courses = await api.courses();
  const canEdit = auth.hasRole(ADMIN);

  main().innerHTML = `
    ${pageHead('Courses', 'Courses that participants can be asked to give feedback on.',
      canEdit ? `<button class="btn btn-primary" data-action="add">${icon('plus', { size: 16 })} Add course</button>` : '')}
    <section class="card">
      ${courses.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Course</th><th>Description</th><th class="num">Duration</th>${canEdit ? '<th class="actions">Actions</th>' : ''}</tr></thead>
            <tbody>${courses
              .map(
                (course) => `
                <tr>
                  <td><strong>${escapeHtml(course.courseName)}</strong></td>
                  <td class="muted">${escapeHtml(course.description ?? '')}</td>
                  <td class="num">${course.duration} hrs</td>
                  ${canEdit
                    ? `<td class="actions">
                        <button class="btn btn-secondary btn-sm" data-edit="${course.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm" data-delete="${course.id}" aria-label="Delete ${escapeHtml(course.courseName)}">${icon('trash', { size: 16 })}</button>
                      </td>`
                    : ''}
                </tr>`
              )
              .join('')}</tbody></table></div>`
        : emptyState({
            iconName: 'book',
            title: 'No courses yet',
            message: canEdit ? 'Add a course so participants have something to give feedback on.' : 'An administrator has not added any courses yet.',
            actionHtml: canEdit ? `<button class="btn btn-primary" data-action="add">Add course</button>` : '',
          })}
    </section>`;

  if (!canEdit) return;
  main().querySelectorAll('[data-action="add"]').forEach((b) => b.addEventListener('click', () => courseModal()));
  main().querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => courseModal(courses.find((c) => c.id === button.dataset.edit)))
  );
  main().querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => {
      const course = courses.find((c) => c.id === button.dataset.delete);
      confirmDialog({
        title: 'Delete course',
        message: `Delete "${course.courseName}"? Feedback already submitted for it will remain in the database.`,
        onConfirm: async () => {
          await api.deleteCourse(course.id);
          toast('Course deleted.', 'success');
          await reload();
        },
      });
    })
  );
}

function courseModal(course = null) {
  openModal({
    title: course ? 'Edit course' : 'Add course',
    submitLabel: course ? 'Save changes' : 'Add course',
    bodyHtml: `
      <div class="field">
        <label for="courseName">Course name <span class="req" aria-hidden="true">*</span></label>
        <input id="courseName" name="courseName" required value="${escapeHtml(course?.courseName ?? '')}" />
        <p class="field-error" data-error-for="courseName"></p>
      </div>
      <div class="field">
        <label for="description">Description <span class="req" aria-hidden="true">*</span></label>
        <textarea id="description" name="description" required>${escapeHtml(course?.description ?? '')}</textarea>
        <p class="field-error" data-error-for="description"></p>
      </div>
      <div class="field">
        <label for="duration">Duration (hours) <span class="req" aria-hidden="true">*</span></label>
        <input id="duration" name="duration" type="number" min="1" required value="${course?.duration ?? ''}" />
        <p class="helper">Must be at least 1 hour.</p>
        <p class="field-error" data-error-for="duration"></p>
      </div>`,
    onSubmit: async (form) => {
      const payload = {
        courseName: form.courseName.value.trim(),
        description: form.description.value.trim(),
        duration: Number(form.duration.value),
      };
      if (course) await api.updateCourse(course.id, payload);
      else await api.createCourse(payload);
      toast(course ? 'Course updated.' : 'Course added.', 'success');
      await reload();
    },
  });
}

/* ============================================================
   Faculty
   ============================================================ */
async function renderFaculty() {
  const faculty = await api.faculty();

  main().innerHTML = `
    ${pageHead('Faculty', 'Trainers available to deliver courses.',
      `<button class="btn btn-primary" data-action="add">${icon('plus', { size: 16 })} Add faculty</button>`)}
    <section class="card">
      ${faculty.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th class="num">Experience</th><th class="actions">Actions</th></tr></thead>
            <tbody>${faculty
              .map(
                (member) => `
                <tr>
                  <td><strong>${escapeHtml(member.facultyName)}</strong></td>
                  <td class="muted">${escapeHtml(member.email)}</td>
                  <td>${escapeHtml(member.department)}</td>
                  <td class="num">${member.experience} yrs</td>
                  <td class="actions">
                    <button class="btn btn-secondary btn-sm" data-edit="${member.id}">Edit</button>
                    <button class="btn btn-ghost btn-sm" data-delete="${member.id}" aria-label="Delete ${escapeHtml(member.facultyName)}">${icon('trash', { size: 16 })}</button>
                  </td>
                </tr>`
              )
              .join('')}</tbody></table></div>`
        : emptyState({
            iconName: 'users',
            title: 'No faculty yet',
            message: 'Add trainers so they can be associated with courses and skills.',
            actionHtml: `<button class="btn btn-primary" data-action="add">Add faculty</button>`,
          })}
    </section>`;

  main().querySelectorAll('[data-action="add"]').forEach((b) => b.addEventListener('click', () => facultyModal()));
  main().querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => facultyModal(faculty.find((f) => f.id === button.dataset.edit)))
  );
  main().querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => {
      const member = faculty.find((f) => f.id === button.dataset.delete);
      confirmDialog({
        title: 'Delete faculty',
        message: `Remove ${member.facultyName} from the faculty list?`,
        onConfirm: async () => {
          await api.deleteFaculty(member.id);
          toast('Faculty removed.', 'success');
          await reload();
        },
      });
    })
  );
}

function facultyModal(member = null) {
  openModal({
    title: member ? 'Edit faculty' : 'Add faculty',
    submitLabel: member ? 'Save changes' : 'Add faculty',
    bodyHtml: `
      <div class="field">
        <label for="facultyName">Name <span class="req" aria-hidden="true">*</span></label>
        <input id="facultyName" name="facultyName" required value="${escapeHtml(member?.facultyName ?? '')}" />
        <p class="field-error" data-error-for="facultyName"></p>
      </div>
      <div class="field">
        <label for="email">Email <span class="req" aria-hidden="true">*</span></label>
        <input id="email" name="email" type="email" required value="${escapeHtml(member?.email ?? '')}" />
        <p class="field-error" data-error-for="email"></p>
      </div>
      <div class="field">
        <label for="department">Department <span class="req" aria-hidden="true">*</span></label>
        <input id="department" name="department" required value="${escapeHtml(member?.department ?? '')}" />
        <p class="field-error" data-error-for="department"></p>
      </div>
      <div class="field">
        <label for="experience">Experience (years) <span class="req" aria-hidden="true">*</span></label>
        <input id="experience" name="experience" type="number" min="0" required value="${member?.experience ?? ''}" />
        <p class="field-error" data-error-for="experience"></p>
      </div>`,
    onSubmit: async (form) => {
      const payload = {
        facultyName: form.facultyName.value.trim(),
        email: form.email.value.trim(),
        department: form.department.value.trim(),
        experience: Number(form.experience.value),
      };
      if (member) await api.updateFaculty(member.id, payload);
      else await api.createFaculty(payload);
      toast(member ? 'Faculty updated.' : 'Faculty added.', 'success');
      await reload();
    },
  });
}

/* ============================================================
   Training programs + enrolment
   ============================================================ */
async function renderPrograms() {
  const canEdit = auth.hasRole(ADMIN, COORDINATOR);
  const [programs, participants] = await Promise.all([
    api.programs(),
    canEdit ? api.users(PARTICIPANT) : Promise.resolve([]),
  ]);
  const byId = new Map(participants.map((user) => [user.id, user]));

  main().innerHTML = `
    ${pageHead('Training Programs', 'Programs, their schedules and who is enrolled.',
      canEdit ? `<button class="btn btn-primary" data-action="add">${icon('plus', { size: 16 })} New program</button>` : '')}
    <section class="card">
      ${programs.length
        ? `<div class="table-wrap"><table>
            <thead><tr>
              <th>Program</th><th>Status</th><th>Schedule</th><th class="num">Enrolled</th>
              ${canEdit ? '<th class="actions">Actions</th>' : ''}
            </tr></thead>
            <tbody>${programs
              .map((program) => {
                const enrolled = program.participantIds?.length ?? 0;
                const full = enrolled >= program.maxParticipants;
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(program.programName)}</strong>
                    <div class="muted" style="font-size:.8125rem">${escapeHtml(program.description ?? '')}</div>
                  </td>
                  <td>${statusBadge(program.status)}</td>
                  <td class="muted" style="font-size:.875rem">${fmt.date(program.startDate)} → ${fmt.date(program.endDate)}</td>
                  <td class="num">
                    ${enrolled} / ${program.maxParticipants}
                    ${full ? '<div class="badge badge-warning" style="margin-top:4px">Full</div>' : ''}
                  </td>
                  ${canEdit
                    ? `<td class="actions">
                        <button class="btn btn-secondary btn-sm" data-manage="${program.id}">Participants</button>
                        <button class="btn btn-secondary btn-sm" data-edit="${program.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm" data-delete="${program.id}" aria-label="Delete ${escapeHtml(program.programName)}">${icon('trash', { size: 16 })}</button>
                      </td>`
                    : ''}
                </tr>`;
              })
              .join('')}</tbody></table></div>`
        : emptyState({
            iconName: 'program',
            title: 'No training programs',
            message: canEdit ? 'Create a program, then enrol participants so they can submit feedback.' : 'No programs have been created yet.',
            actionHtml: canEdit ? `<button class="btn btn-primary" data-action="add">New program</button>` : '',
          })}
    </section>`;

  if (!canEdit) return;
  main().querySelectorAll('[data-action="add"]').forEach((b) => b.addEventListener('click', () => programModal()));
  main().querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => programModal(programs.find((p) => p.id === button.dataset.edit)))
  );
  main().querySelectorAll('[data-manage]').forEach((button) =>
    button.addEventListener('click', () =>
      participantsModal(programs.find((p) => p.id === button.dataset.manage), participants, byId)
    )
  );
  main().querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => {
      const program = programs.find((p) => p.id === button.dataset.delete);
      confirmDialog({
        title: 'Delete training program',
        message: `Delete "${program.programName}"? Enrolments for this program will be lost.`,
        onConfirm: async () => {
          await api.deleteProgram(program.id);
          toast('Program deleted.', 'success');
          await reload();
        },
      });
    })
  );
}

async function programModal(program = null) {
  const coordinators = await api.users(COORDINATOR).catch(() => []);
  const defaultCoordinator = program?.coordinatorId ?? (auth.user.role === COORDINATOR ? auth.user.id : '');

  openModal({
    title: program ? 'Edit training program' : 'New training program',
    submitLabel: program ? 'Save changes' : 'Create program',
    bodyHtml: `
      <div class="field">
        <label for="programName">Program name <span class="req" aria-hidden="true">*</span></label>
        <input id="programName" name="programName" required value="${escapeHtml(program?.programName ?? '')}" />
        <p class="field-error" data-error-for="programName"></p>
      </div>
      <div class="field">
        <label for="description">Description <span class="req" aria-hidden="true">*</span></label>
        <textarea id="description" name="description" required>${escapeHtml(program?.description ?? '')}</textarea>
        <p class="field-error" data-error-for="description"></p>
      </div>
      <div class="field">
        <label for="coordinatorId">Coordinator <span class="req" aria-hidden="true">*</span></label>
        <select id="coordinatorId" name="coordinatorId" required>
          <option value="">Select a coordinator…</option>
          ${coordinators
            .map(
              (user) =>
                `<option value="${user.id}" ${user.id === defaultCoordinator ? 'selected' : ''}>${escapeHtml(user.username)} (${escapeHtml(user.email)})</option>`
            )
            .join('')}
        </select>
        <p class="field-error" data-error-for="coordinatorId"></p>
      </div>
      <div class="field">
        <label for="startDate">Start date <span class="req" aria-hidden="true">*</span></label>
        <input id="startDate" name="startDate" type="date" required value="${program?.startDate ?? ''}" />
        <p class="field-error" data-error-for="startDate"></p>
      </div>
      <div class="field">
        <label for="endDate">End date <span class="req" aria-hidden="true">*</span></label>
        <input id="endDate" name="endDate" type="date" required value="${program?.endDate ?? ''}" />
        <p class="helper">The API requires the end date to be in the future.</p>
        <p class="field-error" data-error-for="endDate"></p>
      </div>
      <div class="field">
        <label for="maxParticipants">Maximum participants <span class="req" aria-hidden="true">*</span></label>
        <input id="maxParticipants" name="maxParticipants" type="number" min="1" required value="${program?.maxParticipants ?? ''}" />
        <p class="field-error" data-error-for="maxParticipants"></p>
      </div>
      <div class="field">
        <label for="status">Status</label>
        <select id="status" name="status">
          ${['UPCOMING', 'ONGOING', 'COMPLETED']
            .map((value) => `<option value="${value}" ${program?.status === value ? 'selected' : ''}>${value}</option>`)
            .join('')}
        </select>
      </div>`,
    onSubmit: async (form) => {
      const payload = {
        programName: form.programName.value.trim(),
        description: form.description.value.trim(),
        coordinatorId: form.coordinatorId.value,
        startDate: form.startDate.value,
        endDate: form.endDate.value,
        maxParticipants: Number(form.maxParticipants.value),
        status: form.status.value,
      };
      if (program) await api.updateProgram(program.id, payload);
      else await api.createProgram(payload);
      toast(program ? 'Program updated.' : 'Program created.', 'success');
      await reload();
    },
  });
}

/**
 * Enrolment manager. Add/remove act immediately against the API and re-render
 * the list in place, so the dialog always reflects server state.
 */
function participantsModal(program, allParticipants, byId) {
  const { form } = openModal({
    title: `Participants · ${program.programName}`,
    submitLabel: 'Done',
    bodyHtml: `<div data-enrolment></div>`,
    onSubmit: async () => reload(),
  });

  const container = form.querySelector('[data-enrolment]');
  let enrolledIds = [...(program.participantIds ?? [])];

  const draw = () => {
    const available = allParticipants.filter((user) => !enrolledIds.includes(user.id));
    const full = enrolledIds.length >= program.maxParticipants;

    container.innerHTML = `
      <p class="muted" style="font-size:.875rem;margin-bottom:12px">
        ${enrolledIds.length} of ${program.maxParticipants} places filled.
      </p>

      ${full
        ? `<div class="alert alert-info">${icon('info', { size: 18 })}<span>This program is at capacity. Remove a participant before adding another.</span></div>`
        : `<div class="filters" style="margin-bottom:16px">
            <div class="field" style="flex:1">
              <label for="add-participant">Add participant</label>
              <select id="add-participant" ${available.length ? '' : 'disabled'}>
                ${available.length
                  ? available.map((user) => `<option value="${user.id}">${escapeHtml(user.username)} — ${escapeHtml(user.email)}</option>`).join('')
                  : '<option>All participants are enrolled</option>'}
              </select>
            </div>
            <button type="button" class="btn btn-primary" data-add ${available.length ? '' : 'disabled'}>Add</button>
          </div>`}

      ${enrolledIds.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Participant</th><th class="actions">Remove</th></tr></thead>
            <tbody>${enrolledIds
              .map((id) => {
                const user = byId.get(id);
                return `<tr>
                  <td>${escapeHtml(user?.username ?? id)}<div class="muted" style="font-size:.8125rem">${escapeHtml(user?.email ?? '')}</div></td>
                  <td class="actions">
                    <button type="button" class="btn btn-ghost btn-sm" data-remove="${id}"
                            aria-label="Remove ${escapeHtml(user?.username ?? id)}">${icon('trash', { size: 16 })}</button>
                  </td>
                </tr>`;
              })
              .join('')}</tbody></table></div>`
        : `<p class="muted">Nobody is enrolled yet. Enrolled participants are the ones tracked by the defaulters report.</p>`}`;

    container.querySelector('[data-add]')?.addEventListener('click', async (event) => {
      const select = container.querySelector('#add-participant');
      const button = event.currentTarget;
      setBusy(button, true, 'Adding…');
      try {
        const updated = await api.enroll(program.id, select.value);
        enrolledIds = [...(updated.participantIds ?? [])];
        toast('Participant enrolled.', 'success');
        draw();
      } catch (error) {
        toast(error.message, 'error');
        setBusy(button, false);
      }
    });

    container.querySelectorAll('[data-remove]').forEach((button) =>
      button.addEventListener('click', async () => {
        try {
          const updated = await api.unenroll(program.id, button.dataset.remove);
          enrolledIds = [...(updated.participantIds ?? [])];
          toast('Participant removed.', 'success');
          draw();
        } catch (error) {
          toast(error.message, 'error');
        }
      })
    );
  };

  draw();
}

/* ============================================================
   Submit feedback (US-015)
   ============================================================ */
async function renderSubmitFeedback() {
  const [programs, courses, mine] = await Promise.all([api.programs(), api.courses(), api.myFeedback()]);
  const enrolled = programs.filter((program) => program.participantIds?.includes(auth.user.id));
  const submitted = new Set(mine.map((entry) => `${entry.trainingProgramId}:${entry.courseId}`));

  if (!enrolled.length) {
    main().innerHTML = `
      ${pageHead('Submit Feedback', 'Share your experience of a course within a training program.')}
      <section class="card">${emptyState({
        iconName: 'program',
        title: 'You are not enrolled in any program',
        message: 'Only enrolled participants can submit feedback. Ask your coordinator to enrol you.',
      })}</section>`;
    return;
  }
  if (!courses.length) {
    main().innerHTML = `
      ${pageHead('Submit Feedback', 'Share your experience of a course within a training program.')}
      <section class="card">${emptyState({
        iconName: 'book',
        title: 'No courses available',
        message: 'An administrator has not added any courses yet, so there is nothing to review.',
      })}</section>`;
    return;
  }

  main().innerHTML = `
    ${pageHead('Submit Feedback', 'Rate a course you attended. One response per course, per program.')}
    <div class="grid grid-2">
      <section class="card">
        <div class="card-head"><h2>New feedback</h2></div>
        <form class="card-body" id="feedback-form" novalidate style="display:grid;gap:16px">
          <div class="field">
            <label for="trainingProgramId">Training program <span class="req" aria-hidden="true">*</span></label>
            <select id="trainingProgramId" name="trainingProgramId" required>
              ${enrolled.map((p) => `<option value="${p.id}">${escapeHtml(p.programName)}</option>`).join('')}
            </select>
            <p class="field-error" data-error-for="trainingProgramId"></p>
          </div>

          <div class="field">
            <label for="courseId">Course <span class="req" aria-hidden="true">*</span></label>
            <select id="courseId" name="courseId" required>
              ${courses.map((c) => `<option value="${c.id}">${escapeHtml(c.courseName)}</option>`).join('')}
            </select>
            <p class="helper" data-duplicate-hint></p>
            <p class="field-error" data-error-for="courseId"></p>
          </div>

          <fieldset class="field" style="border:0;padding:0">
            <legend style="font-size:.875rem;font-weight:500;margin-bottom:4px">Rating <span class="req" aria-hidden="true">*</span></legend>
            <div class="rating-input" role="radiogroup" aria-label="Rating out of 5">
              ${[1, 2, 3, 4, 5]
                .map(
                  (value) => `
                  <input type="radio" id="rating-${value}" name="rating" value="${value}" ${value === 5 ? 'checked' : ''} />
                  <label for="rating-${value}" title="${value} star${value === 1 ? '' : 's'}">
                    <span class="visually-hidden">${value} star${value === 1 ? '' : 's'}</span>
                    ${icon('star', { size: 26 })}
                  </label>`
                )
                .join('')}
            </div>
            <p class="helper" data-rating-text>5 out of 5 — excellent</p>
            <p class="field-error" data-error-for="rating"></p>
          </fieldset>

          <div class="field">
            <label for="comments">Comments</label>
            <textarea id="comments" name="comments" maxlength="1000"
              placeholder="What worked well? What could be improved?"></textarea>
            <p class="helper"><span data-char-count>0</span> / 1000 characters</p>
            <p class="field-error" data-error-for="comments"></p>
          </div>

          <button type="submit" class="btn btn-primary">Submit feedback</button>
        </form>
      </section>

      <section class="card">
        <div class="card-head"><h2>Already submitted</h2></div>
        <div class="card-body">
          ${mine.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>Course</th><th>Program</th><th class="num">Rating</th></tr></thead>
                <tbody>${mine
                  .map(
                    (entry) => `<tr>
                      <td>${escapeHtml(entry.courseName ?? '—')}</td>
                      <td class="muted">${escapeHtml(entry.programName ?? '—')}</td>
                      <td class="num">${ratingDisplay(entry.rating)}</td>
                    </tr>`
                  )
                  .join('')}</tbody></table></div>
              <p class="muted" style="font-size:.8125rem;padding:16px 0 0">
                To change a response, use My Feedback.
              </p>`
            : emptyState({ title: 'Nothing submitted yet', message: 'Your submitted feedback will be listed here.' })}
        </div>
      </section>
    </div>`;

  const form = document.getElementById('feedback-form');
  const RATING_WORDS = { 1: 'poor', 2: 'below expectations', 3: 'satisfactory', 4: 'good', 5: 'excellent' };

  const updateDuplicateHint = () => {
    const key = `${form.trainingProgramId.value}:${form.courseId.value}`;
    const hint = form.querySelector('[data-duplicate-hint]');
    const already = submitted.has(key);
    hint.textContent = already
      ? 'You have already reviewed this course for this program. Edit it from My Feedback instead.'
      : '';
    hint.style.color = already ? 'var(--color-warning)' : '';
    form.querySelector('button[type="submit"]').disabled = already;
  };

  form.trainingProgramId.addEventListener('change', updateDuplicateHint);
  form.courseId.addEventListener('change', updateDuplicateHint);
  updateDuplicateHint();

  form.querySelectorAll('input[name="rating"]').forEach((radio) =>
    radio.addEventListener('change', () => {
      const value = Number(form.rating.value);
      form.querySelector('[data-rating-text]').textContent = `${value} out of 5 — ${RATING_WORDS[value]}`;
      form.querySelectorAll('.rating-input label').forEach((label, index) =>
        label.classList.toggle('filled', index < value)
      );
    })
  );
  form.querySelectorAll('.rating-input label').forEach((label, index) => label.classList.toggle('filled', index < 5));

  form.comments.addEventListener('input', () => {
    form.querySelector('[data-char-count]').textContent = String(form.comments.value.length);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    clearFieldErrors(form);
    setBusy(button, true, 'Submitting…');
    try {
      await api.submitFeedback({
        trainingProgramId: form.trainingProgramId.value,
        courseId: form.courseId.value,
        rating: Number(form.rating.value),
        comments: form.comments.value.trim(),
      });
      toast('Feedback submitted. Thank you!', 'success');
      location.hash = '/my-feedback';
    } catch (error) {
      showFormError(form, error);
      toast(error.message, 'error');
      setBusy(button, false);
    }
  });
}

/* ============================================================
   My feedback (US-018)
   ============================================================ */
async function renderMyFeedback() {
  const mine = await api.myFeedback();

  main().innerHTML = `
    ${pageHead('My Feedback', 'Everything you have submitted. You can revise your own responses at any time.',
      `<a class="btn btn-primary" href="#/submit-feedback">${icon('plus', { size: 16 })} Submit feedback</a>`)}
    <section class="card">
      ${mine.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Course</th><th>Program</th><th class="num">Rating</th><th>Comments</th><th>Submitted</th><th class="actions">Actions</th></tr></thead>
            <tbody>${mine
              .map(
                (entry) => `
                <tr>
                  <td><strong>${escapeHtml(entry.courseName ?? '—')}</strong></td>
                  <td class="muted">${escapeHtml(entry.programName ?? '—')}</td>
                  <td class="num">${ratingDisplay(entry.rating)}</td>
                  <td class="muted" style="max-width:32ch">${escapeHtml(entry.comments || '—')}</td>
                  <td class="muted" style="font-size:.8125rem">
                    ${fmt.dateTime(entry.submittedAt)}
                    ${entry.updatedAt ? `<div class="badge badge-info" style="margin-top:4px">Edited</div>` : ''}
                  </td>
                  <td class="actions"><button class="btn btn-secondary btn-sm" data-edit="${entry.id}">Edit</button></td>
                </tr>`
              )
              .join('')}</tbody></table></div>`
        : emptyState({
            iconName: 'message',
            title: 'No feedback yet',
            message: 'Once you review a course, your responses appear here and stay editable.',
            actionHtml: `<a class="btn btn-primary" href="#/submit-feedback">Submit your first feedback</a>`,
          })}
    </section>`;

  main().querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => editFeedbackModal(mine.find((entry) => entry.id === button.dataset.edit)))
  );
}

function editFeedbackModal(entry) {
  openModal({
    title: `Edit feedback · ${entry.courseName ?? ''}`,
    submitLabel: 'Save changes',
    bodyHtml: `
      <div class="alert alert-info">
        ${icon('info', { size: 18 })}
        <span>The course and program are fixed. You can change your rating and comments.</span>
      </div>
      <fieldset class="field" style="border:0;padding:0">
        <legend style="font-size:.875rem;font-weight:500;margin-bottom:4px">Rating</legend>
        <div class="rating-input" role="radiogroup" aria-label="Rating out of 5">
          ${[1, 2, 3, 4, 5]
            .map(
              (value) => `
              <input type="radio" id="edit-rating-${value}" name="rating" value="${value}" ${value === entry.rating ? 'checked' : ''} />
              <label for="edit-rating-${value}" class="${value <= entry.rating ? 'filled' : ''}" title="${value} star${value === 1 ? '' : 's'}">
                <span class="visually-hidden">${value} star${value === 1 ? '' : 's'}</span>
                ${icon('star', { size: 26 })}
              </label>`
            )
            .join('')}
        </div>
        <p class="field-error" data-error-for="rating"></p>
      </fieldset>
      <div class="field">
        <label for="edit-comments">Comments</label>
        <textarea id="edit-comments" name="comments" maxlength="1000">${escapeHtml(entry.comments ?? '')}</textarea>
        <p class="field-error" data-error-for="comments"></p>
      </div>`,
    onMount: (form) => {
      form.querySelectorAll('input[name="rating"]').forEach((radio) =>
        radio.addEventListener('change', () => {
          const value = Number(form.rating.value);
          form.querySelectorAll('.rating-input label').forEach((label, index) =>
            label.classList.toggle('filled', index < value)
          );
        })
      );
    },
    onSubmit: async (form) => {
      await api.updateFeedback(entry.id, {
        trainingProgramId: entry.trainingProgramId,
        courseId: entry.courseId,
        rating: Number(form.rating.value),
        comments: form.comments.value.trim(),
      });
      toast('Feedback updated.', 'success');
      await reload();
    },
  });
}

/* ============================================================
   Feedback reports (US-016)
   ============================================================ */
async function renderFeedbackReports() {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const [programs, courses] = await Promise.all([api.programs(), api.courses()]);

  main().innerHTML = `
    ${pageHead('Feedback Reports', 'Every response submitted, filterable by program and course.')}
    <section class="card" style="margin-bottom:24px">
      <div class="card-body">
        <form class="filters" id="filter-form">
          <div class="field">
            <label for="filter-program">Training program</label>
            <select id="filter-program" name="trainingProgramId">
              <option value="">All programs</option>
              ${programs.map((p) => `<option value="${p.id}">${escapeHtml(p.programName)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="filter-course">Course</label>
            <select id="filter-course" name="courseId">
              <option value="">All courses</option>
              ${courses.map((c) => `<option value="${c.id}">${escapeHtml(c.courseName)}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Apply filters</button>
          <button type="button" class="btn btn-ghost" data-reset>Reset</button>
        </form>
      </div>
    </section>
    <section class="card" id="results">${skeletonRows(4)}</section>`;

  const form = document.getElementById('filter-form');
  if (params.get('program')) form.trainingProgramId.value = params.get('program');

  const load = async () => {
    const results = document.getElementById('results');
    results.innerHTML = skeletonRows(4);
    try {
      const feedback = await api.allFeedback({
        trainingProgramId: form.trainingProgramId.value,
        courseId: form.courseId.value,
      });
      results.innerHTML = feedbackTable(feedback);
      results.querySelectorAll('[data-delete]').forEach((button) =>
        button.addEventListener('click', () => {
          confirmDialog({
            title: 'Delete feedback',
            message: 'Permanently delete this feedback entry? This cannot be undone.',
            onConfirm: async () => {
              await api.deleteFeedback(button.dataset.delete);
              toast('Feedback deleted.', 'success');
              await load();
            },
          });
        })
      );
    } catch (error) {
      results.innerHTML = errorState(error);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    load();
  });
  form.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    load();
  });
  await load();
}

function feedbackTable(feedback) {
  if (!feedback.length) {
    return emptyState({
      iconName: 'inbox',
      title: 'No feedback matches these filters',
      message: 'Try widening the filters, or wait for participants to submit their responses.',
    });
  }

  const avg = feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length;
  const canDelete = auth.hasRole(ADMIN);

  return `
    <div class="card-head">
      <h2>${feedback.length} response${feedback.length === 1 ? '' : 's'}</h2>
      <span class="badge badge-info" style="margin-left:auto">Average ${avg.toFixed(2)} / 5</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Participant</th><th>Course</th><th>Program</th>
        <th class="num">Rating</th><th>Comments</th><th>Submitted</th>
        ${canDelete ? '<th class="actions">Actions</th>' : ''}
      </tr></thead>
      <tbody>${feedback
        .map(
          (entry) => `
          <tr>
            <td><strong>${escapeHtml(entry.participantName ?? '—')}</strong></td>
            <td>${escapeHtml(entry.courseName ?? '—')}</td>
            <td class="muted">${escapeHtml(entry.programName ?? '—')}</td>
            <td class="num">${ratingDisplay(entry.rating)}</td>
            <td class="muted" style="max-width:36ch">${escapeHtml(entry.comments || '—')}</td>
            <td class="muted" style="font-size:.8125rem">${fmt.dateTime(entry.submittedAt)}</td>
            ${canDelete
              ? `<td class="actions"><button class="btn btn-ghost btn-sm" data-delete="${entry.id}" aria-label="Delete feedback">${icon('trash', { size: 16 })}</button></td>`
              : ''}
          </tr>`
        )
        .join('')}</tbody>
    </table></div>`;
}

/* ============================================================
   Defaulters (US-017)
   ============================================================ */
async function renderDefaulters() {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const programs = await api.programs();

  if (!programs.length) {
    main().innerHTML = `
      ${pageHead('Defaulters Report', 'Enrolled participants who have not submitted feedback.')}
      <section class="card">${emptyState({
        iconName: 'program',
        title: 'No training programs',
        message: 'Create a program and enrol participants before running this report.',
      })}</section>`;
    return;
  }

  main().innerHTML = `
    ${pageHead('Defaulters Report', 'Enrolled participants who have not yet submitted any feedback for a program.')}
    <section class="card" style="margin-bottom:24px">
      <div class="card-body">
        <div class="filters">
          <div class="field" style="flex:1;max-width:420px">
            <label for="program-select">Training program</label>
            <select id="program-select">
              ${programs.map((p) => `<option value="${p.id}">${escapeHtml(p.programName)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </section>
    <div id="report"></div>`;

  const select = document.getElementById('program-select');
  if (params.get('program')) select.value = params.get('program');

  const load = async () => {
    const container = document.getElementById('report');
    container.innerHTML = `<div class="card">${skeletonRows(3)}</div>`;
    try {
      const report = await api.defaulters(select.value);
      const responseRate = report.enrolledCount ? (report.submittedCount / report.enrolledCount) * 100 : 0;

      container.innerHTML = `
        <div class="grid grid-stats" style="margin-bottom:24px">
          ${statCard({ label: 'Enrolled', value: report.enrolledCount, sub: 'participants in this program', iconName: 'users' })}
          ${statCard({ label: 'Responded', value: report.submittedCount, sub: 'submitted at least one feedback', iconName: 'userCheck' })}
          ${statCard({ label: 'Defaulters', value: report.defaulterCount, sub: 'no feedback submitted', iconName: 'alert' })}
          ${statCard({ label: 'Response rate', value: fmt.percent(responseRate), sub: 'of enrolled participants', iconName: 'trending' })}
        </div>

        <section class="card">
          <div class="card-head">
            <h2>Defaulters in ${escapeHtml(report.programName)}</h2>
            ${report.defaulterCount
              ? `<span class="badge badge-danger" style="margin-left:auto">${report.defaulterCount} outstanding</span>`
              : `<span class="badge badge-success" style="margin-left:auto">All responded</span>`}
          </div>
          ${report.defaulters.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>#</th><th>Participant</th><th>Email</th></tr></thead>
                <tbody>${report.defaulters
                  .map(
                    (person, index) => `
                    <tr>
                      <td class="muted tabular">${index + 1}</td>
                      <td><strong>${escapeHtml(person.username ?? '—')}</strong></td>
                      <td class="muted">${escapeHtml(person.email ?? '—')}</td>
                    </tr>`
                  )
                  .join('')}</tbody></table></div>`
            : emptyState({
                iconName: 'checkCircle',
                title: 'Every enrolled participant has responded',
                message: `All ${report.enrolledCount} enrolled participants have submitted feedback for this program.`,
              })}
        </section>`;
    } catch (error) {
      container.innerHTML = `<div class="card">${errorState(error)}</div>`;
    }
  };

  select.addEventListener('change', load);
  await load();
}

/* ============================================================
   Training summary (US-019)
   ============================================================ */
async function renderTrainingSummary() {
  const summaries = await api.trainingSummary();

  if (!summaries.length) {
    main().innerHTML = `
      ${pageHead('Training Summary', 'Participation and feedback health for every program.')}
      <section class="card">${emptyState({
        iconName: 'program',
        title: 'No training programs',
        message: 'Create a training program to see its summary here.',
      })}</section>`;
    return;
  }

  const totals = summaries.reduce(
    (acc, program) => ({
      enrolled: acc.enrolled + program.enrolledCount,
      feedback: acc.feedback + program.feedbackCount,
      defaulters: acc.defaulters + program.defaulterCount,
    }),
    { enrolled: 0, feedback: 0, defaulters: 0 }
  );
  const overallRate = totals.enrolled ? ((totals.enrolled - totals.defaulters) / totals.enrolled) * 100 : 0;

  main().innerHTML = `
    ${pageHead('Training Summary', `Participation and feedback health across ${summaries.length} program${summaries.length === 1 ? '' : 's'}.`)}
    <div class="grid grid-stats" style="margin-bottom:24px">
      ${statCard({ label: 'Programs', value: summaries.length, iconName: 'program' })}
      ${statCard({ label: 'Total enrolled', value: totals.enrolled, iconName: 'users' })}
      ${statCard({ label: 'Feedback received', value: totals.feedback, iconName: 'message' })}
      ${statCard({ label: 'Overall response rate', value: fmt.percent(overallRate), sub: `${totals.defaulters} defaulters`, iconName: 'trending' })}
    </div>

    <section class="card" style="margin-bottom:24px">
      <div class="card-head"><h2>Response rate by program</h2></div>
      <div class="card-body">
        ${horizontalBarChart(
          summaries.map((program) => ({
            label: program.programName,
            value: program.responseRate,
            note: `${program.respondentCount} of ${program.enrolledCount}`,
          })),
          { max: 100, unit: '%', summary: 'Percentage of enrolled participants who submitted feedback, by program' }
        )}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>All programs</h2></div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Program</th><th>Status</th><th>Schedule</th>
          <th class="num">Enrolled</th><th class="num">Responses</th><th class="num">Defaulters</th>
          <th class="num">Response rate</th><th class="num">Avg rating</th>
        </tr></thead>
        <tbody>${summaries
          .map(
            (program) => `
            <tr>
              <td><strong>${escapeHtml(program.programName)}</strong></td>
              <td>${statusBadge(program.status)}</td>
              <td class="muted" style="font-size:.875rem">${fmt.date(program.startDate)} → ${fmt.date(program.endDate)}</td>
              <td class="num">${program.enrolledCount} / ${program.maxParticipants}</td>
              <td class="num">${program.feedbackCount}</td>
              <td class="num">${
                program.defaulterCount > 0
                  ? `<span class="badge badge-danger">${program.defaulterCount}</span>`
                  : `<span class="badge badge-success">0</span>`
              }</td>
              <td class="num" style="min-width:130px">
                <div class="tabular" style="margin-bottom:4px">${fmt.percent(program.responseRate)}</div>
                <div class="progress"><div class="progress-bar" style="width:${Math.min(program.responseRate, 100)}%"></div></div>
              </td>
              <td class="num">${program.feedbackCount ? ratingDisplay(program.averageRating) : '<span class="muted">—</span>'}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table></div>
    </section>`;
}

/* ============================================================
   Course analytics (US-020)
   ============================================================ */
async function renderCourseAnalytics() {
  const analytics = await api.courseAnalytics();

  if (!analytics.length) {
    main().innerHTML = `
      ${pageHead('Course Analytics', 'Rating distribution and satisfaction per course.')}
      <section class="card">${emptyState({
        iconName: 'book',
        title: 'No courses to analyse',
        message: 'Add a course and collect feedback to see analytics here.',
      })}</section>`;
    return;
  }

  const rated = analytics.filter((course) => course.totalFeedback > 0);
  const totalFeedback = analytics.reduce((sum, course) => sum + course.totalFeedback, 0);
  const best = rated.slice().sort((a, b) => b.averageRating - a.averageRating)[0];
  const worst = rated.slice().sort((a, b) => a.averageRating - b.averageRating)[0];

  main().innerHTML = `
    ${pageHead('Course Analytics', `Rating distribution and satisfaction across ${analytics.length} course${analytics.length === 1 ? '' : 's'}.`)}
    <div class="grid grid-stats" style="margin-bottom:24px">
      ${statCard({ label: 'Courses', value: analytics.length, sub: `${rated.length} with feedback`, iconName: 'book' })}
      ${statCard({ label: 'Total responses', value: totalFeedback, iconName: 'message' })}
      ${statCard({ label: 'Highest rated', value: best ? best.averageRating.toFixed(2) : '—', sub: best?.courseName ?? 'no data', iconName: 'star' })}
      ${statCard({ label: 'Lowest rated', value: worst ? worst.averageRating.toFixed(2) : '—', sub: worst?.courseName ?? 'no data', iconName: 'alert' })}
    </div>

    ${rated.length
      ? `<section class="card" style="margin-bottom:24px">
          <div class="card-head"><h2>Average rating by course</h2></div>
          <div class="card-body">
            ${horizontalBarChart(
              rated.slice().sort((a, b) => b.averageRating - a.averageRating).map((course) => ({
                label: course.courseName,
                value: course.averageRating,
                note: `${course.totalFeedback} responses`,
              })),
              { max: 5, summary: 'Average rating out of 5, by course' }
            )}
            <p class="muted" style="font-size:.8125rem;margin-top:12px">Scale: 0 to 5. Hover a bar for the response count.</p>
          </div>
        </section>`
      : ''}

    <div class="grid grid-2">
      ${analytics.map(courseAnalyticsCard).join('')}
    </div>`;
}

function courseAnalyticsCard(course) {
  if (course.totalFeedback === 0) {
    return `
      <section class="card">
        <div class="card-head"><h2>${escapeHtml(course.courseName)}</h2></div>
        <div class="card-body">${emptyState({
          iconName: 'inbox',
          title: 'No feedback yet',
          message: 'Nobody has reviewed this course. Charts appear once the first response arrives.',
        })}</div>
      </section>`;
  }

  const satisfactionVariant =
    course.satisfactionRate >= 70 ? 'badge-success' : course.satisfactionRate >= 40 ? 'badge-warning' : 'badge-danger';

  return `
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(course.courseName)}</h2>
        <span class="badge ${satisfactionVariant}" style="margin-left:auto">${fmt.percent(course.satisfactionRate)} satisfied</span>
      </div>
      <div class="card-body">
        <div class="grid grid-stats" style="margin-bottom:20px">
          <div><div class="stat-label">Responses</div><div class="stat-value" style="font-size:1.5rem">${course.totalFeedback}</div></div>
          <div><div class="stat-label">Average</div><div class="stat-value" style="font-size:1.5rem">${course.averageRating.toFixed(2)}</div></div>
          <div><div class="stat-label">Range</div><div class="stat-value" style="font-size:1.5rem">${course.lowestRating}–${course.highestRating}</div></div>
        </div>

        ${ratingDistributionChart(course.ratingDistribution, {
          summary: `${course.courseName}: ${course.totalFeedback} responses, average ${course.averageRating.toFixed(2)} out of 5.`,
        })}

        ${legend([
          { label: '1–2 stars (needs attention)', color: 'var(--chart-4)' },
          { label: '3 stars (neutral)', color: 'var(--chart-3)' },
          { label: '4–5 stars (satisfied)', color: 'var(--chart-1)' },
        ])}

        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--color-border)">
          ${donutChart(course.satisfactionRate, {
            label: 'satisfied',
            caption: `${course.satisfactionRate.toFixed(0)} percent of responses rated this course 4 or 5 out of 5.`,
          })}
          <p class="muted" style="text-align:center;font-size:.8125rem">Share of responses rating 4 or 5.</p>
        </div>
      </div>
    </section>`;
}
