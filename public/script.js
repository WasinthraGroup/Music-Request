const supabaseUrl = 'https://fucrcbuqbpnbftyljqgi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3JjYnVxYnBuYmZ0eWxqcWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc1MTIsImV4cCI6MjA5MTI1MzUxMn0.XXKIgZ_9Ciciq3qfgINK48J70HbunRyP28p1MiIv6To';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. Global State ---
let currentUser = null;

// --- 3. Authentication & Profile Logic ---
async function checkUserAuth() {
    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        
        if (authError || !user) {
            updateGuestUI();
            return;
        }

        // ดึงข้อมูล Profile จากฐานข้อมูล
        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        currentUser = profile;
        updateUserUI(profile);

    } catch (err) {
        console.error("Auth Error:", err.message);
        updateGuestUI();
    }
}

// --- 4. UI Management ---
function updateUserUI(profile) {
    const avatar = profile.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
    const displayName = profile.full_name || profile.username || 'User';

    // อัปเดตแถบสถานะในหน้า Music Room
    $('#authStatus').html(`
        <div class="flex items-center gap-2">
            <img src="${avatar}" class="w-6 h-6 rounded-full border border-[#b38b59]">
            <span class="text-xs font-bold text-[#b38b59]">สวัสดี, ${displayName}</span>
        </div>
    `);
}

function updateGuestUI() {
    $('#authStatus').html(`
        <a href="login.html" class="text-xs font-bold text-gray-400 hover:text-[#721c24] transition-colors">
            <i class="fa-solid fa-right-to-bracket mr-1"></i> เข้าสู่ระบบเพื่อขอเพลง
        </a>
    `);
}

// --- 5. Initialization ---
$(document).ready(() => {
    checkUserAuth();
});
