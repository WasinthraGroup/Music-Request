const supabaseUrl = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. Global State ---
let currentUser = null;

// --- 3. Authentication Logic ---
async function checkUserAuth() {
    const isLoginPage = window.location.pathname.includes('login.html');

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        
        if (authError || !user) {
            // ถ้าไม่มี User และ "ไม่ได้อยู่ที่หน้า login" ให้ส่งไปหน้า login
            if (!isLoginPage) {
                console.warn("Unauthorized access - Redirecting to login...");
                window.location.href = 'login.html';
            }
            return;
        }

        // --- ถ้า Login แล้ว ---
        
        // ถ้าอยู่ที่หน้า login แต่ดันมี User (Login ค้างไว้) ให้ส่งไปหน้าหลัก
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
        $('body').removeClass('hidden'); // แสดงหน้าเว็บเมื่อทุกอย่างพร้อม

    } catch (err) {
        console.error("Critical Auth Error:", err.message);
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
}

async function logout() {
    await client.auth.signOut();
    window.location.href = 'login.html';
}

// --- 4. UI Management ---
function updateUserUI(profile) {
    const avatar = profile.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
    const displayName = profile.full_name || profile.username || 'User';

    $('#authStatus').html(`
        <div class="flex items-center gap-2 bg-white/50 py-1 pl-1 pr-3 rounded-full border border-[#b38b59]/20 shadow-sm">
            <img src="${avatar}" class="w-7 h-7 rounded-full object-cover border border-[#b38b59]">
            <span class="text-[11px] font-bold text-[#b38b59]">${displayName}</span>
        </div>
    `);
}

// --- 5. Initialization ---
$(document).ready(() => {
    checkUserAuth();
});
