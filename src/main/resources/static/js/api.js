/**
 * Thin REST client for the Feedback Management API.
 *
 * The backend returns two error shapes:
 *   { "error": "message" }                  — business + auth errors
 *   { "fieldName": "message", ... }         — bean validation failures (400)
 * ApiError normalises both.
 */

const TOKEN_KEY = 'fms.token';
const USER_KEY = 'fms.user';

export class ApiError extends Error {
  constructor(status, message, fieldErrors = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save(authResponse) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
      email: authResponse.email,
      role: authResponse.role,
    }));
  },
  saveProfile(user) {
    const current = auth.user ?? {};
    localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  get isAuthenticated() {
    return Boolean(auth.token);
  },
  hasRole(...roles) {
    return roles.includes(auth.user?.role);
  },
};

/** Fires when the token is rejected, so the app can bounce to the login screen. */
export const onUnauthorized = { handler: () => {} };

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the application running?');
  }

  if (response.status === 401) {
    auth.clear();
    onUnauthorized.handler();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }
  return payload;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function toApiError(status, payload) {
  if (status === 403) {
    return new ApiError(403, payload?.error || 'You do not have permission to do that.');
  }
  if (payload && typeof payload === 'object') {
    if (typeof payload.error === 'string') return new ApiError(status, payload.error);

    // Validation map: surface the messages and keep the field mapping for inline errors.
    const entries = Object.entries(payload).filter(([, v]) => typeof v === 'string');
    if (entries.length) {
      const message = entries.map(([, v]) => v).join('. ');
      return new ApiError(status, message, Object.fromEntries(entries));
    }
  }
  return new ApiError(status, `Request failed (HTTP ${status}).`);
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path) => request('DELETE', path);

const qs = (params) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return search ? `?${search}` : '';
};

export const api = {
  login: (credentials) => post('/auth/login', credentials),
  register: (details) => post('/auth/register', details),

  me: () => get('/users/me'),
  users: (role) => get(`/users${qs({ role })}`),

  courses: () => get('/course'),
  createCourse: (course) => post('/course', course),
  updateCourse: (id, course) => put(`/course/${id}`, course),
  deleteCourse: (id) => del(`/course/${id}`),

  faculty: () => get('/faculty'),
  createFaculty: (faculty) => post('/faculty', faculty),
  updateFaculty: (id, faculty) => put(`/faculty/${id}`, faculty),
  deleteFaculty: (id) => del(`/faculty/${id}`),

  programs: () => get('/training-programs'),
  createProgram: (program) => post('/training-programs', program),
  updateProgram: (id, program) => put(`/training-programs/${id}`, program),
  deleteProgram: (id) => del(`/training-programs/${id}`),
  enroll: (programId, participantId) => post(`/training-programs/${programId}/participants/${participantId}`),
  unenroll: (programId, participantId) => del(`/training-programs/${programId}/participants/${participantId}`),

  submitFeedback: (feedback) => post('/feedback', feedback),
  updateFeedback: (id, feedback) => put(`/feedback/${id}`, feedback),
  deleteFeedback: (id) => del(`/feedback/${id}`),
  myFeedback: () => get('/feedback/my'),
  allFeedback: (filters = {}) => get(`/feedback${qs(filters)}`),

  defaulters: (programId) => get(`/reports/defaulters/${programId}`),
  trainingSummary: () => get('/reports/training-summary'),
  courseAnalytics: () => get('/reports/course-analytics'),
  courseAnalyticsFor: (courseId) => get(`/reports/course-analytics/${courseId}`),
};
