const SUPABASE_URL = 'https://gzlgufleaukelahqwofx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bGd1ZmxlYXVrZWxhaHF3b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQ4MTgsImV4cCI6MjA5MzA0MDgxOH0.eQTq-kLKV7E9XYTOVZMosZuG41Gfgq5sJD8sZUaE778';
const ADMIN_API    = ''; // same origin — works locally and on Render
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ─── Tab switch ───────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('auth-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('auth-register').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('auth-msg').textContent = '';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function register() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const msg      = document.getElementById('auth-msg');

  if (!name || !email || !password) return setMsg(msg, 'All fields required.');

  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name } }
  });

  if (error) return setMsg(msg, error.message);
  setMsg(msg, 'Account created! Check your email to confirm, then log in.', true);
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msg      = document.getElementById('auth-msg');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return setMsg(msg, error.message);
  currentUser = data.user;
  showApp();
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

// ─── App ──────────────────────────────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const name = currentUser.user_metadata?.full_name || currentUser.email;
  document.getElementById('user-name').textContent = name;
  loadTasks();
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
async function loadTasks() {
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (error) { console.error(error); return; }

  const pending   = data.filter(t => t.status === 'pending');
  const completed = data.filter(t => t.status === 'completed');

  document.getElementById('pending-count').textContent   = pending.length;
  document.getElementById('completed-count').textContent = completed.length;

  document.getElementById('pending-list').innerHTML =
    pending.length ? pending.map(taskCard).join('') : '<p class="empty">No pending tasks.</p>';
  document.getElementById('completed-list').innerHTML =
    completed.length ? completed.map(taskCard).join('') : '<p class="empty">No completed tasks.</p>';
}

function taskCard(t) {
  return `
    <div class="task-card ${t.status === 'completed' ? 'completed' : ''}" id="tc-${t.id}">
      <div class="task-title">${esc(t.title)}</div>
      ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
      <div class="task-actions">
        <button class="btn-sm btn-toggle" onclick="toggleTask('${t.id}','${t.status}')">
          ${t.status === 'pending' ? 'Mark complete' : 'Mark pending'}
        </button>
        <button class="btn-sm btn-edit" onclick="toggleEdit('${t.id}')">Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteTask('${t.id}')">Delete</button>
      </div>
      <div class="edit-form" id="ef-${t.id}">
        <input type="text" id="et-${t.id}" value="${esc(t.title)}" placeholder="Title" />
        <textarea id="ed-${t.id}" placeholder="Description">${esc(t.description || '')}</textarea>
        <div class="edit-actions">
          <button class="btn-sm btn-save" onclick="saveEdit('${t.id}')">Save</button>
          <button class="btn-sm btn-cancel" onclick="toggleEdit('${t.id}')">Cancel</button>
        </div>
      </div>
    </div>`;
}

async function addTask() {
  const title = document.getElementById('task-title').value.trim();
  const desc  = document.getElementById('task-desc').value.trim();
  const msg   = document.getElementById('task-msg');

  if (!title) return setMsg(msg, 'Title is required.');

  const { error } = await sb.from('tasks').insert({
    user_id: currentUser.id,
    title,
    description: desc,
    status: 'pending'
  });

  if (error) return setMsg(msg, error.message);
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value  = '';
  msg.textContent = '';
  loadTasks();
}

async function toggleTask(id, currentStatus) {
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  await sb.from('tasks').update({ status: newStatus }).eq('id', id);
  loadTasks();
}

function toggleEdit(id) {
  document.getElementById(`ef-${id}`).classList.toggle('open');
}

async function saveEdit(id) {
  const title = document.getElementById(`et-${id}`).value.trim();
  const desc  = document.getElementById(`ed-${id}`).value.trim();
  if (!title) return;
  await sb.from('tasks').update({ title, description: desc }).eq('id', id);
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await sb.from('tasks').delete().eq('id', id);
  loadTasks();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setMsg(el, text, success = false) {
  el.textContent = text;
  el.className = 'msg' + (success ? ' success' : '');
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
sb.auth.getSession().then(({ data }) => {
  if (data.session) {
    currentUser = data.session.user;
    showApp();
  }
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    currentUser = null;
  }
});
