const supabaseUrl = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

async function checkUserAuth() {
    const isLoginPage = window.location.pathname.includes('login.html');

    try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        
        if (sessionError || !session) {
            if (!isLoginPage) window.location.href = 'login.html';
            return;
        }

        const user = session.user;

        if (isLoginPage) {
            window.location.href = 'index.html';
            return;
        }

        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Profile not found, creating one...");
            currentUser = { id: user.id, username: user.email.split('@')[0], full_name: '' };
        } else {
            currentUser = profile;
        }

        updateUserUI(currentUser);
        $('body').removeClass('hidden');

    } catch (err) {
        console.error("Auth Error:", err.message);
        if (!isLoginPage) window.location.href = 'login.html';
    }
}

function updateUserUI(profile) {
    const avatar = profile.avatar_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7csvPWMdfAHEAnhIRTdJKCK5SPK4cHfskow&s';
    
    $('#navAction').html(`
        <button onclick="openProfileModal()" class="flex items-center gap-2 hover:opacity-80 transition-all focus:outline-none">
            <img src="${avatar}" class="w-10 h-10 rounded-full object-cover border-2 border-[#fdfaf5] shadow-sm profile-img-nav">
            <div class="hidden lg:block text-left">
                <p class="text-[11px] font-bold text-[#721c24] leading-none">${profile.username || 'User'}</p>
                <p class="text-[9px] text-gray-400 uppercase tracking-tighter">Staff Profile</p>
            </div>
        </button>
    `);
    
    setupNavigation();
}

function setupNavigation() {
    const navLinks = [
        { name: 'หน้าหลัก', href: 'https://studio-5lgd.onrender.com' },
        { name: 'เวิร์กชอป', href: 'https://studio-5lgd.onrender.com/workshop.html' },
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
    const { error } = await client.auth.signOut();
    window.location.href = 'login.html';
}

$('#avatarInput').on('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    Swal.fire({ title: 'กำลังอัปโหลดรูปภาพ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 1. Upload to Storage
        let { error: uploadError } = await client.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = client.storage.from('avatars').getPublicUrl(filePath);

        // 3. Update Database
        const { error: updateError } = await client
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUser.id);

        if (updateError) throw updateError;

        $('#profilePreview').attr('src', publicUrl);
        $('.profile-img-nav').attr('src', publicUrl);
        currentUser.avatar_url = publicUrl;

        Swal.fire({ icon: 'success', title: 'อัปโหลดสำเร็จ', timer: 1000, showConfirmButton: false });
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
});

$('#profileUpdateForm').on('submit', async function(e) {
    e.preventDefault();
    const updates = {
        username: $('#editUsername').val(),
        full_name: $('#editFullName').val(),
        updated_at: new Date()
    };

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const { error } = await client.from('profiles').upsert({
        id: currentUser.id,
        ...updates
    });

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
