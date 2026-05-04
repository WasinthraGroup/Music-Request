// --- Configuration ---
const SUPABASE_URL = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// --- 1. เริ่มต้นระบบ (Prevent White Screen) ---
$(document).ready(async function() {
    try {
        // ตรวจสอบ Session
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        
        if (session) {
            const { data: profile } = await client
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            currentUser = profile;
        }

        // แสดงผล UI พื้นฐาน
        updateNavbarUI(session);
        
        // --- ส่วนเสริมสำหรับหน้าเล่นเพลง (Music Room Logic) ---
        // ถ้าคุณมีฟังก์ชันสำหรับดึงเพลงหรือตั้งค่าเครื่องเล่น YouTube ให้เรียกที่นี่
        // initMusicRoom(); 

    } catch (err) {
        console.error("Initialization Error:", err);
    } finally {
        // สำคัญที่สุด: เอาคลาส hidden ออกเพื่อให้หน้าเว็บแสดงผล
        $('body').removeClass('hidden');
    }
});

// --- 2. Navbar & UI Management ---
async function updateNavbarUI(session) {
    const navAction = $('#navAction');
    const desktopNav = $('#desktopNav');
    const mobileMenuLinks = $('#mobileMenuLinks');
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    const menuItems = [
        { name: 'หน้าแรก', url: 'index.html' },
        { name: 'เวิร์กชอป', url: 'workshop.html' }
    ];

    // Render Desktop Nav
    const navHtml = menuItems.map(item => `
        <a href="${item.url}" class="text-sm font-bold transition-colors ${currentPage === item.url ? 'text-[#721c24]' : 'text-gray-500 hover:text-[#721c24]'}">
            ${item.name}
        </a>`).join('');
    
    desktopNav.html(navHtml);
    mobileMenuLinks.html(navHtml);

    if (session && currentUser) {
        const avatar = currentUser.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
        
        navAction.html(`
            <div class="relative inline-block text-left">
                <button onclick="toggleDropdown()" class="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100">
                    <div class="text-right hidden md:block">
                        <p class="text-xs font-bold text-gray-800 leading-none">${currentUser.full_name || currentUser.username}</p>
                        <p class="text-[10px] text-gray-400 uppercase mt-1 tracking-tighter">${currentUser.role || 'Member'}</p>
                    </div>
                    <img src="${avatar}" class="w-10 h-10 rounded-full object-cover border-2 border-[#b38b59]/20 shadow-sm">
                </button>
                <div id="profileDropdown" class="hidden absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[1001] animate__animated animate__fadeInUp animate__faster">
                    <button onclick="openProfileModal()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">⚙️ ตั้งค่าโปรไฟล์</button>
                    <a href="workshop.html" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">📅 ตารางงานของฉัน</a>
                    <hr class="my-2 border-gray-50">
                    <button onclick="logout()" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">🚪 ออกจากระบบ</button>
                </div>
            </div>`);
    } else {
        navAction.html(`
            <div class="flex items-center gap-3">
                <a href="login.html" class="hidden md:block text-sm font-bold text-gray-600 hover:text-[#721c24]">เข้าสู่ระบบ</a>
                <a href="login.html" class="bg-[#721c24] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 hover:opacity-90 active:scale-95 transition-all">เริ่มใช้งาน</a>
            </div>`);
    }
}

// --- 3. Profile & Interaction Functions ---
function toggleDropdown() { $('#profileDropdown').toggleClass('hidden'); }
function toggleMobileMenu() { $('#mobileMenu').toggleClass('hidden'); }

$(window).on('click', e => {
    if (!$(e.target).closest('#navAction').length) $('#profileDropdown').addClass('hidden');
});

function openProfileModal() {
    $('#profileDropdown').addClass('hidden');
    $('#profileModal').removeClass('hidden').css('display', 'flex');
    $('#editUsername').val(currentUser?.username || '');
    $('#editFullName').val(currentUser?.full_name || '');
    if (currentUser?.avatar_url) $('#profilePreview').attr('src', currentUser.avatar_url);
}

function closeProfileModal() {
    $('#profileModal').addClass('hidden').css('display', 'none');
}

// อัปเดตโปรไฟล์
$('#profileUpdateForm').submit(async function(e) {
    e.preventDefault();
    const newUsername = $('#editUsername').val().trim().toLowerCase();
    const newName = $('#editFullName').val().trim();
    const newPass = $('#newProfilePass').val(); 
    const avatarFile = $('#avatarInput')[0].files[0];

    closeProfileModal();
    Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });

    try {
        let avatarUrl = currentUser.avatar_url;
        if (avatarFile) {
            const fileName = `${currentUser.id}-${Date.now()}`;
            const { data: uploadData, error: uploadError } = await client.storage.from('avatars').upload(fileName, avatarFile);
            if (uploadError) throw uploadError;
            avatarUrl = client.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
        }

        const { error: updateError } = await client.from('profiles').update({ 
            full_name: newName, username: newUsername, avatar_url: avatarUrl 
        }).eq('id', currentUser.id);

        if (updateError) throw updateError;

        if (newPass && newPass.trim() !== "") {
            const { error: passError } = await client.auth.updateUser({ password: newPass });
            if (passError) throw passError;
        }

        Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'ข้อมูลถูกอัปเดตแล้ว' }).then(() => location.reload());
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
});

// Logout
async function logout() {
    await client.auth.signOut();
    window.location.href = 'index.html';
}

// Preview รูปก่อนอัปโหลด
$('#avatarInput').change(function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => $('#profilePreview').attr('src', e.target.result);
        reader.readAsDataURL(file);
    }
});
