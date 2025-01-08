import API_BASE_URL from '../../apis/apiConfig.js';

// Kiểm tra localStorage khi trang đăng nhập được tải
window.onload = function() {
    const user = localStorage.getItem('user');
    if (user) {
        // Nếu có user, chuyển đến giao diện chính
        window.location.href = '../index/index.html';
    }
};

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Use the fetch API to call the login endpoint
    fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        if (data.success && data.data.user) {
            // Store user information
            localStorage.setItem('user', JSON.stringify(data.data.user));
            localStorage.setItem('avatar', data.data.user.image);
            // Load the main interface
            window.location.href = '../index/index.html';
        } else {
            alert(data.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Đã xảy ra lỗi khi đăng nhập!');
    });
}); 