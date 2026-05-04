const supabaseUrl = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

async function checkUserAuth() {
    const isLoginPage = window.location.pathname.includes('login.html');

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        
        if (authError || !user) {
            if (!isLoginPage) {
                window.location.href = 'login.html';
            }
            return; 
        }

        if (isLoginPage) {
            window.location.href = 'index.html';
            return;
        }

        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        currentUser = profile;
        updateUserUI(profile);
        
        if (!isLoginPage) {
            $('body').removeClass('hidden');
        }

    } catch (err) {
        console.error(err.message);
        if (!isLoginPage) window.location.href = 'login.html';
    }
}

function updateUserUI(profile) {
    const avatar = profile.avatar_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7csvPWMdfAHEAnhIRTdJKCK5SPK4cHfskow&s';
    
    $('#navAction').html(`
        <button onclick="openProfileModal()" class="flex items-center gap-2 hover:opacity-80 transition-all focus:outline-none">
            <img src="${avatar}" class="w-10 h-10 rounded-full object-cover border-2 border-[#fdfaf5] shadow-sm">
            <div class="hidden lg:block text-left">
                <p class="text-[11px] font-bold text-[#721c24] leading-none">${profile.username}</p>
                <p class="text-[9px] text-gray-400 uppercase tracking-tighter">Staff Profile</p>
            </div>
        </button>
    `);
    
    setupNavigation();
}

function setupNavigation() {
    const navLinks = [
        { name: 'หน้าหลัก', href: 'https://wasinstudio.com' },
        { name: 'จัดการงาน', href: '#' }, 
        { name: 'ห้องเพลง', href: 'index.html' }
    ];

    const desktopNav = $('#desktopNav');
    const mobileMenuLinks = $('#mobileMenuLinks');
    
    desktopNav.empty();
    mobileMenuLinks.empty();

    navLinks.forEach(link => {
        const cls = "text-sm font-bold text-gray-600 hover:text-[#721c24] transition-all";
        desktopNav.append(`<a href="${link.href}" class="${cls}">${link.name}</a>`);
        mobileMenuLinks.append(`<a href="${link.href}" class="${cls} py-2 border-b border-gray-50">${link.name}</a>`);
    });
}

function toggleMobileMenu() {
    $('#mobileMenu').toggleClass('hidden');
}

function openProfileModal() {
    if (!currentUser) return;
    $('#editUsername').val(currentUser.username);
    $('#editFullName').val(currentUser.full_name);
    $('#profilePreview').attr('src', currentUser.avatar_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7csvPWMdfAHEAnhIRTdJKCK5SPK4cHfskow&s');
    $('#profileModal').removeClass('hidden').addClass('flex');
}

function closeProfileModal() {
    $('#profileModal').addClass('hidden').removeClass('flex');
}

async function logout() {
    await client.auth.signOut();
    window.location.href = 'login.html';
}

$('#profileUpdateForm').on('submit', async function(e) {
    e.preventDefault();
    const updates = {
        username: $('#editUsername').val(),
        full_name: $('#editFullName').val(),
        updated_at: new Date()
    };

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const { error } = await client.from('profiles').update(updates).eq('id', currentUser.id);

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
        setTimeout(() => location.reload(), 1500);
    }
});

$(document).ready(() => {
    checkUserAuth();
});
