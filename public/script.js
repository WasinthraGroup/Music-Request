const SUPABASE_URL = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeTaskId = null;
let currentOpenTaskId = null;

// --- 1. Core Authentication & Initialization ---
$(document).ready(async function() {
    const { data: { session } } = await client.auth.getSession();
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    if (session) {
        const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        currentUser = profile;
    }

    // Update Navbar UI After getting profile
    updateNavbarUI(session);

    // Route Protection & Page Logic
    if (currentPage === 'login.html') {
        if (session) { window.location.href = 'workshop.html'; return; }
    } 
    else if (currentPage === 'workshop.html' || currentPage === 'assignments.html') {
        if (!session) { window.location.href = 'login.html'; return; }
        if (currentPage === 'workshop.html') initWorkshop();
        if (currentPage === 'assignments.html') initAssignmentsPage();
    } 
    else if (currentPage === 'index.html' || currentPage === '') {
        loadContents('news', 'newsContainer');
        loadContents('projects', 'projectsContainer');
    }

    // Global Event Handlers
    initGlobalEvents();
});

function initGlobalEvents() {
    // Login Form
    $('#loginForm').submit(async (e) => {
        e.preventDefault();
        const userInput = $('#username').val().trim().toLowerCase();
        const password = $('#password').val();
        if (!userInput || !password) return Swal.fire({ icon: 'info', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

        Swal.fire({ title: 'กำลังเข้าสู่ระบบ...', didOpen: () => Swal.showLoading() });
        try {
            let finalEmail = userInput;
            if (!userInput.includes('@')) {
                const { data: profile } = await client.from('profiles').select('email').eq('username', userInput).single();
                if (!profile) return Swal.fire({ icon: 'error', title: 'ไม่พบชื่อผู้ใช้งานนี้' });
                finalEmail = profile.email;
            }
            const { error } = await client.auth.signInWithPassword({ email: finalEmail, password });
            if (error) throw error;
            window.location.href = 'workshop.html';
        } catch (err) { Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ถูกต้อง หรือระบบขัดข้อง' }); }
    });

    // Logout
    $(document).on('click', '#logoutBtn', async () => {
        await client.auth.signOut();
        window.location.href = 'index.html';
    });

    // Close Dropdown on outside click
    $(window).on('click', e => {
        if (!$(e.target).closest('#navAction').length) $('#profileDropdown').addClass('hidden');
    });

    // Avatar Preview
    $('#avatarInput').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => $('#profilePreview').attr('src', e.target.result);
            reader.readAsDataURL(file);
        }
    });
}

// --- 2. Navbar & Profile Management ---
async function updateNavbarUI(session) {
    const navAction = $('#navAction');
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const menuItems = [{ name: 'หน้าแรก', url: 'index.html' }, { name: 'เวิร์กชอป', url: 'workshop.html' }];
    
    $('#desktopNav').html(menuItems.map(item => `
        <a href="${item.url}" class="text-sm font-bold transition-colors ${currentPage === item.url ? 'text-[#721c24]' : 'text-gray-500 hover:text-[#721c24]'}">
            ${item.name}
        </a>`).join(''));

    if (session) {
        const avatar = currentUser?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
        navAction.html(`
            <div class="relative inline-block text-left">
                <button onclick="toggleDropdown()" class="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100">
                    <div class="text-right hidden md:block">
                        <p class="text-xs font-bold text-gray-800 leading-none">${currentUser?.full_name || currentUser?.username}</p>
                        <p class="text-[10px] text-gray-400 uppercase mt-1 tracking-tighter">${currentUser?.role}</p>
                    </div>
                    <img src="${avatar}" class="w-10 h-10 rounded-full object-cover border-2 border-[#b38b59]/20 shadow-sm">
                </button>
                <div id="profileDropdown" class="hidden absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[1001] animate__animated animate__fadeInUp animate__faster">
                    <button onclick="openProfileModal()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">⚙️ ตั้งค่าโปรไฟล์</button>
                    <a href="workshop.html" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">📅 ตารางงานของฉัน</a>
                    <hr class="my-2 border-gray-50">
                    <button id="logoutBtn" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">🚪 ออกจากระบบ</button>
                </div>
            </div>`);
    } else {
        navAction.html(`
            <div class="flex items-center gap-3">
                <a href="login.html" class="hidden md:block text-sm font-bold text-gray-600 hover:text-[#721c24]">เข้าสู่ระบบ</a>
                <a href="login.html" class="bg-[#721c24] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all">เริ่มใช้งาน</a>
            </div>`);
    }
}

function toggleDropdown() { $('#profileDropdown').toggleClass('hidden'); }

function openProfileModal() {
    $('#profileDropdown').addClass('hidden');
    $('#profileModal').removeClass('hidden').css('display', 'flex');
    $('#editUsername').val(currentUser?.username || '');
    $('#editFullName').val(currentUser?.full_name || '');
    if (currentUser?.avatar_url) $('#profilePreview').attr('src', currentUser.avatar_url);
}

function closeProfileModal() { $('#profileModal').addClass('hidden').css('display', 'none'); }

$('#profileUpdateForm').submit(async function(e) {
    e.preventDefault();
    const newUsername = $('#editUsername').val().trim().toLowerCase();
    const newName = $('#editFullName').val().trim();
    const newPass = $('#newProfilePass').val(); 
    const avatarFile = $('#avatarInput')[0].files[0];

    closeProfileModal();
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let avatarUrl = currentUser.avatar_url;
        if (avatarFile) {
            const fileName = `avatars/${currentUser.id}-${Date.now()}`;
            const { error: uploadError } = await client.storage.from('avatars').upload(fileName, avatarFile);
            if (uploadError) throw uploadError;
            avatarUrl = client.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
        }

        const { error: updateError } = await client.from('profiles').update({ 
            full_name: newName, username: newUsername, avatar_url: avatarUrl 
        }).eq('id', currentUser.id);
        if (updateError) throw updateError;

        if (newPass && newPass.trim() !== "") {
            await client.auth.updateUser({ password: newPass });
        }

        Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'อัปเดตข้อมูลเรียบร้อยแล้ว' }).then(() => location.reload());
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
});

// --- 3. Workshop & Assignments Logic ---
async function initWorkshop() {
    $('#userDisplay').text("ผู้ใช้งาน: " + (currentUser.full_name || currentUser.username)).removeClass('hidden');
    renderCalendar(currentUser.id, currentUser.role);
    loadAssignmentsListSimple();
    $('body').removeClass('hidden');
}

async function loadAssignmentsListSimple() {
    const { data } = await client.from('assignments').select('*').order('due_date', { ascending: true });
    const container = $('#assignmentList');
    if (!container.length) return;
    container.empty();
    if (!data?.length) return container.append('<p class="text-center py-10 text-gray-400">ไม่มีงานที่มอบหมาย</p>');
    
    data.forEach(task => {
        container.append(`
            <div onclick="window.location.href='assignments.html'" class="p-4 border rounded-xl mb-3 bg-white shadow-sm cursor-pointer hover:border-[#721c24] transition-all">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-gray-800">${task.title}</h4>
                    <span class="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">DUE: ${new Date(task.due_date).toLocaleDateString('th-TH')}</span>
                </div>
                <p class="text-xs text-gray-500 mt-2 line-clamp-1">${task.description || '-'}</p>
            </div>`);
    });
}

function initAssignmentsPage() {
    $('#navAvatar, #streamAvatar').attr('src', currentUser.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png');
    if (currentUser.role === 'hr' || currentUser.role === 'admin') $('#hrOnlyAction').removeClass('hidden');
    switchTab('stream');
    $('body').removeClass('hidden');
}

function switchTab(tab) {
    $('.nav-tab').removeClass('active');
    $(`#tab-${tab}`).addClass('active');
    $('.tab-content').addClass('hidden');
    $(`#section-${tab}`).removeClass('hidden');
    if (tab === 'stream') loadStream();
    if (tab === 'classwork') loadClasswork();
    if (tab === 'people') loadPeople();
}

async function openTaskModal(id) {
    activeTaskId = id;
    const isHR = (currentUser.role === 'hr' || currentUser.role === 'admin');
    $('#submissionView').html('<div class="flex justify-center py-4"><i class="fa-solid fa-circle-notch fa-spin text-[#721c24] text-xl"></i></div>');

    try {
        const { data: task } = await client.from('assignments').select('*').eq('id', id).single();
        $('#mTaskTitle').text(task.title);
        $('#mTaskDesc').html(urlToLink(task.description));
        $('#mTaskDue').text(new Date(task.due_date).toLocaleDateString('th-TH'));

        if (isHR) {
            $('#submissionView').html('<div id="hrSubmissionsList" class="divide-y"></div>');
            loadSubmissionsForHR(id);
        } else {
            const { data: subData } = await client.from('submissions').select('*').eq('task_id', id).eq('user_id', currentUser.id);
            const sub = subData?.[0];
            if (!sub) {
                $('#submissionView').html(`
                    <input type="url" id="workUrl" placeholder="วางลิงก์งานของคุณ..." class="w-full border rounded-xl p-3 text-sm mb-3">
                    <button onclick="submitWork('${id}')" class="w-full py-3 bg-[#721c24] text-white rounded-xl font-bold">ส่งงาน</button>`);
            } else {
                renderStatus(sub);
            }
        }
        $('#taskModal').removeClass('hidden');
        loadComments();
    } catch (err) { console.error(err); }
}

function urlToLink(text) {
    if (!text) return '-';
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, (url) => `<a href="${url}" target="_blank" class="text-blue-500 underline">${url}</a>`);
}

async function loadContents(type, containerId) {
    const { data } = await client.from('contents').select('*').eq('type', type).order('created_at', { ascending: false });
    const container = $(`#${containerId}`).empty();
    data?.forEach(item => {
        container.append(`
            <article class="bg-white overflow-hidden shadow-sm hover:shadow-md transition rounded-2xl border border-gray-100">
                <div class="h-48 bg-gray-200 bg-cover bg-center" style="background-image: url('${item.image_url || 'https://t4.ftcdn.net/jpg/06/57/37/01/360_F_657370150_pdNeG5pjI976ZasVbKN9VqH1rfoykdYU.jpg'}')"></div>
                <div class="p-6">
                    <span class="text-[10px] font-bold text-red-700 uppercase tracking-widest">${item.type}</span>
                    <h3 class="font-bold text-lg mt-2 mb-3">${item.title}</h3>
                    <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">${item.description}</p>
                </div>
            </article>`);
    });
}
