/** Handles Supabase email/password sign-in before loading the classroom. */
document.addEventListener('DOMContentLoaded', () => {
    const app = document.querySelector('.app-container');
    const gate = document.getElementById('auth-gate');
    const form = document.getElementById('auth-form');
    const message = document.getElementById('auth-message');
    const submit = document.getElementById('auth-submit');
    const toggle = document.getElementById('auth-toggle');
    let signUpMode = false;

    const renderGate = (text = '') => {
        app.hidden = true;
        gate.hidden = false;
        message.textContent = text;
        submit.textContent = signUpMode ? 'Tạo tài khoản' : 'Đăng nhập';
        toggle.textContent = signUpMode ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Tạo tài khoản';
    };

    toggle.addEventListener('click', () => {
        signUpMode = !signUpMode;
        renderGate();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        if (password.length < 6) return renderGate('Mật khẩu cần có ít nhất 6 ký tự.');
        submit.disabled = true;
        message.textContent = 'Đang xử lý...';
        const result = signUpMode
            ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
            : await supabaseClient.auth.signInWithPassword({ email, password });
        submit.disabled = false;
        if (result.error) return renderGate(result.error.message);
        if (signUpMode && !result.data.session) return renderGate('Hãy xác nhận email, sau đó đăng nhập lại.');
        window.location.reload();
    });

    document.getElementById('btn-sign-out').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            gate.hidden = true;
            app.hidden = false;
        } else {
            renderGate();
        }
    });
});
