const SUPABASE_URL = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

$(document).ready(async function() {
    try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html'; 
            return; 
        }

        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError) throw profileError;
        currentUser = profile;

        updateNavbarUI(session);

        
        $('body').removeClass('hidden');

    } catch (err) {
        console.error("Auth/Init Error:", err);
        window.location.href = 'login.html';
    }
});

async function updateNavbarUI(session) {
    const navAction = $('#navAction');
    const desktopNav = $('#desktopNav');
    const mobileMenuLinks = $('#mobileMenuLinks');
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    const menuItems = [
        { name: 'หน้าแรก', url: 'index.html' },
        { name: 'เวิร์กชอป', url: 'workshop.html' }
    ];

    const navHtml = menuItems.map(item => `
        <a href="${item.url}" class="text-sm font-bold transition-colors ${currentPage === item.url ? 'text-[#721c24]' : 'text-gray-500 hover:text-[#721c24]'}">
            ${item.name}
        </a>`).join('');
    
    desktopNav.html(navHtml);
    mobileMenuLinks.html(navHtml);

    const avatar = currentUser?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
    navAction.html(`
        <div class="relative inline-block text-left">
            <button onclick="toggleDropdown()" class="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100">
                <div class="text-right hidden md:block">
                    <p class="text-xs font-bold text-gray-800 leading-none">${currentUser?.full_name || currentUser?.username}</p>
                    <p class="text-[10px] text-gray-400 uppercase mt-1 tracking-tighter">${currentUser?.role || 'Member'}</p>
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
}

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

$('#profileUpdateForm').submit(async function(e) {
    e.preventDefault();
    const newUsername = $('#editUsername').val().trim().toLowerCase();
    const newName = $('#editFullName').val().trim();
    const newPass = $('#newProfilePass').val(); 
    const avatarFile = $('#avatarInput')[0].files[0];

    closeProfileModal();
    Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        let avatarUrl = currentUser.avatar_url;
        if (avatarFile) {
            const fileName = `avatars/${currentUser.id}-${Date.now()}`;
            const { data, error: uploadError } = await client.storage.from('avatars').upload(fileName, avatarFile);
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

        Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'อัปเดตข้อมูลแล้ว' }).then(() => location.reload());
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: err.message });
    }
});

$('#avatarInput').change(function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => $('#profilePreview').attr('src', e.target.result);
        reader.readAsDataURL(file);
    }
});

async function logout() {
    await client.auth.signOut();
    window.location.href = 'login.html';
}
