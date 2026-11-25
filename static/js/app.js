/**
 * Tasks List frontend
 * Работает с API:
 *   POST /auth/register, POST /auth/login
 *   GET/POST /tasks, GET/PATCH/DELETE /tasks/{id}
 */

const API = ""; // same origin — FastAPI раздаёт static

const state = {
  token: localStorage.getItem("token") || null,
  email: localStorage.getItem("email") || null,
  tasks: [],
  filter: "all", // all | active | done
  mode: "login", // login | register
};

// ——— DOM ———
const $ = (sel) => document.querySelector(sel);
const authScreen = $("#auth-screen");
const appScreen = $("#app-screen");
const authForm = $("#auth-form");
const authError = $("#auth-error");
const authSubmit = $("#auth-submit");
const emailInput = $("#email");
const passwordInput = $("#password");
const taskList = $("#task-list");
const emptyState = $("#empty-state");
const tasksError = $("#tasks-error");
const addTaskForm = $("#add-task-form");
const newTaskTitle = $("#new-task-title");
const userEmailEl = $("#user-email");
const logoutBtn = $("#logout-btn");

// ——— API helpers ———
async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `\u041e\u0448\u0438\u0431\u043a\u0430 ${res.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = res.status;
    throw err;
  }

  return data;
}

// ——— Auth ———
function setAuthMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === mode);
  });
  authSubmit.textContent = mode === "login" ? "\u0412\u043e\u0439\u0442\u0438" : "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f";
  authError.hidden = true;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.tab));
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  authSubmit.disabled = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (state.mode === "register") {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    }

    const tokenData = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    state.token = tokenData.access_token;
    state.email = email;
    localStorage.setItem("token", state.token);
    localStorage.setItem("email", email);
    showApp();
  } catch (err) {
    authError.textContent = err.message || "\u041e\u0448\u0438\u0431\u043a\u0430 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438";
    authError.hidden = false;
  } finally {
    authSubmit.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  state.token = null;
  state.email = null;
  state.tasks = [];
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  showAuth();
});

// ——— Tasks ———
async function loadTasks() {
  tasksError.hidden = true;
  try {
    let doneParam = "";
    if (state.filter === "active") doneParam = "?done=false&limit=100";
    else if (state.filter === "done") doneParam = "?done=true&limit=100";
    else doneParam = "?limit=100";

    state.tasks = await api(`/tasks${doneParam}`);
    renderTasks();
  } catch (err) {
    if (err.status === 401) {
      logoutBtn.click();
      return;
    }
    tasksError.textContent = err.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0438";
    tasksError.hidden = false;
  }
}

function renderTasks() {
  taskList.innerHTML = "";
  emptyState.hidden = state.tasks.length > 0;

  state.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item${task.done ? " done" : ""}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <button class="task-check" title="\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c" aria-label="\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c">${task.done ? "\u2713" : ""}</button>
      <span class="task-title"></span>
      <div class="task-actions">
        <button class="task-btn edit" title="\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c">\u270e</button>
        <button class="task-btn delete" title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c">\u2715</button>
      </div>
    `;
    li.querySelector(".task-title").textContent = task.title;

    li.querySelector(".task-check").addEventListener("click", () => toggleDone(task));
    li.querySelector(".edit").addEventListener("click", () => startEdit(li, task));
    li.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));

    taskList.appendChild(li);
  });
}

async function toggleDone(task) {
  try {
    const updated = await api(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: !task.done }),
    });
    const idx = state.tasks.findIndex((t) => t.id === task.id);
    if (idx !== -1) state.tasks[idx] = updated;
    if (state.filter !== "all") {
      await loadTasks();
    } else {
      renderTasks();
    }
  } catch (err) {
    tasksError.textContent = err.message;
    tasksError.hidden = false;
  }
}

function startEdit(li, task) {
  const titleEl = li.querySelector(".task-title");
  const input = document.createElement("input");
  input.className = "task-title-input";
  input.value = task.title;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const save = async () => {
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === task.title) {
      renderTasks();
      return;
    }
    try {
      const updated = await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
      });
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) state.tasks[idx] = updated;
      renderTasks();
    } catch (err) {
      tasksError.textContent = err.message;
      tasksError.hidden = false;
      renderTasks();
    }
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
    if (e.key === "Escape") {
      renderTasks();
    }
  });
}

async function deleteTask(id) {
  if (!confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443?")) return;
  try {
    await api(`/tasks/${id}`, { method: "DELETE" });
    state.tasks = state.tasks.filter((t) => t.id !== id);
    renderTasks();
  } catch (err) {
    tasksError.textContent = err.message;
    tasksError.hidden = false;
  }
}

addTaskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = newTaskTitle.value.trim();
  if (!title) return;

  try {
    const task = await api("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, done: false }),
    });
    if (state.filter !== "done") {
      state.tasks.unshift(task);
      renderTasks();
    }
    newTaskTitle.value = "";
    newTaskTitle.focus();
  } catch (err) {
    tasksError.textContent = err.message;
    tasksError.hidden = false;
  }
});

// filters
document.querySelectorAll(".filter").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.filter;
    loadTasks();
  });
});

// ——— Screens ———
function showAuth() {
  authScreen.removeAttribute("hidden");
  appScreen.setAttribute("hidden", "");
  passwordInput.value = "";
  authError.hidden = true;
}

function showApp() {
  authScreen.setAttribute("hidden", "");
  appScreen.removeAttribute("hidden");
  userEmailEl.textContent = state.email || "";
  loadTasks();
}

// ——— Init ———
if (state.token) {
  showApp();
} else {
  showAuth();
}
