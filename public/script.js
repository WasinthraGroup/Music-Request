const SUPABASE_URL = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

$(document).ready(async function() {
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    try {
        const { data: { session } } = await client.auth.getSession();
        
        if (!session && currentPage !== 'login.html') {
            window.location.href = 'login.html'; 
            return; 
        }

        if (session && currentPage === 'login.html') {
            window.location.href = 'index.html';
            return;
        }

        if (session) {
            const { data: profile } = await client
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            currentUser = profile;
            updateNavbarUI(session);
        }

        $('body').removeClass('hidden');

    } catch (err) {
        console.error("Initialization Error:", err);
        if (currentPage !== 'login.html') window.location.href = 'login.html';
    }
});

$(document).on('submit', '#loginForm', async function(e) {
    e.preventDefault();
    const userInput = $('#username').val().trim().toLowerCase();
    const password = $('#password').val();

    if (!userInput || !password) {
        return Swal.fire({ icon: 'info', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    Swal.fire({ title: 'กำลังเข้าสู่ระบบ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        let finalEmail = userInput;

        if (!userInput.includes('@')) {
            const { data: profile, error: profileError } = await client
                .from('profiles')
                .select('email')
                .eq('username', userInput)
                .single();

            if (profileError || !profile) {
                return Swal.fire({ icon: 'error', title: 'ไม่พบชื่อผู้ใช้งานนี้' });
            }
            finalEmail = profile.email;
        }

        const { error: authError } = await client.auth.signInWithPassword({
            email: finalEmail,
            password: password
        });

        if (authError) {
            Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ถูกต้อง' });
        } else {
            window.location.href = 'index.html'; 
        }
    } catch (err) {
        console.error("Login Error:", err);
        Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง' });
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
                <button onclick="openProfileModal()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">⚙️ ตั้งค่าโปรไฟล์</button>
                <a href="workshop.html" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">📅 ตารางงานของฉัน</a>
                <hr class="my-2 border-gray-50">
                <button onclick="logout()" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">🚪 ออกจากระบบ</button>
            </div>
        </div>`);
}

function toggleDropdown() { $('#profileDropdown').toggleClass('hidden'); }
function toggleMobileMenu() { $('#mobileMenu').toggleClass('hidden'); }

$(window).on('click', e => {
    if (!$(e.target).closest('#navAction').length) $('#profileDropdown').addClass('hidden');
});

async function logout() {
    await client.auth.signOut();
    window.location.href = 'login.html';
}
