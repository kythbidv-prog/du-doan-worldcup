// ĐOẠN CẤU HÌNH: Thay thế bằng thông tin Firebase của bạn ở Bước 1
const firebaseConfig = {
  apiKey: "MÃ_CỦA_BẠN",
  authDomain: "MÃ_CỦA_BẠN",
  databaseURL: "MÃ_CỦA_BẠN",
  projectId: "MÃ_CỦA_BẠN",
  storageBucket: "MÃ_CỦA_BẠN",
  messagingSenderId: "MÃ_CỦA_BẠN",
  appId: "MÃ_CỦA_BẠN"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUsername = null;

// Tự động tải dữ liệu khi mở trang
loadLeaderboard();
checkLogin();

// ================= CHỨC NĂNG: ĐĂNG KÝ / ĐĂNG NHẬP (LƯU DATABASE THẬT) =================
document.getElementById('registerBtn').addEventListener('click', function() {
    const user = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();

    if(!user || !pass) { alert('Vui lòng điền đủ thông tin!'); return; }
    if(user.includes(" ") || user.includes(".")) { alert('Tên tài khoản không được chứa dấu chấm hoặc khoảng cách!'); return; }

    // Kiểm tra tài khoản đã tồn tại chưa trên Firebase
    database.ref('users/' + user).once('value', snapshot => {
        if(snapshot.exists()) {
            alert('Tài khoản này đã có người sử dụng!');
        } else {
            // Tạo tài khoản mới cấp sẵn 500 điểm thưởng làm vốn
            database.ref('users/' + user).set({
                password: pass,
                points: 500,
                currentPrediction: "None"
            }).then(() => {
                alert('Đăng ký tài khoản thành công! Bây giờ bạn hãy bấm Đăng Nhập.');
            });
        }
    });
});

document.getElementById('loginBtn').addEventListener('click', function() {
    const user = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();

    database.ref('users/' + user).once('value', snapshot => {
        if(snapshot.exists() && snapshot.val().password === pass) {
            localStorage.setItem('wc_user', user);
            currentUsername = user;
            uiToLoggedIn(user, snapshot.val().points);
            checkUserPredictionStatus();
        } else {
            alert('Sai thông tin tài khoản hoặc mật khẩu!');
        }
    });
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('wc_user');
    location.reload();
});

function checkLogin() {
    const storedUser = localStorage.getItem('wc_user');
    if(storedUser) {
        currentUsername = storedUser;
        database.ref('users/' + storedUser).on('value', snapshot => {
            if(snapshot.exists()) {
                uiToLoggedIn(storedUser, snapshot.val().points);
                checkUserPredictionStatus();
            }
        });
    }
}

function uiToLoggedIn(username, points) {
    document.getElementById('authForms').classList.add('hidden');
    document.getElementById('userWelcome').classList.remove('hidden');
    document.getElementById('predictionForm').classList.remove('hidden');
    document.getElementById('loginReminder').classList.add('hidden');
    document.getElementById('welcomeText').innerText = `Thành viên: ${username.toUpperCase()}`;
    document.getElementById('userPoints').innerText = points;
}

// ================= CHỨC NĂNG: GỬI DỰ ĐOÁN VÀO ĐỒNG BỘ DỮ LIỆU =================
function submitPrediction(choice) {
    if(!currentUsername) return;
    
    let textChoice = choice === 'Team A' ? 'Brazil Thắng' : (choice === 'Team B' ? 'Pháp Thắng' : 'Cửa Hòa');
    
    database.ref('users/' + currentUsername).update({
        currentPrediction: choice
    }).then(() => {
        alert(`Bạn đã dự đoán thành công: ${textChoice}`);
        checkUserPredictionStatus();
    });
}

function checkUserPredictionStatus() {
    database.ref('users/' + currentUsername + '/currentPrediction').once('value', snapshot => {
        let choice = snapshot.val();
        let statusText = document.getElementById('currentPredictionStatus');
        if(choice && choice !== "None") {
            let text = choice === 'Team A' ? 'Brazil Thắng' : (choice === 'Team B' ? 'Pháp Thắng' : 'Hòa');
            statusText.innerText = `Bạn đã đặt dự đoán cho trận này: ${text}. Bạn vẫn có thể bấm chọn lại nếu muốn đổi ý.`;
        } else {
            statusText.innerText = "Bạn chưa tham gia dự đoán trận đấu này.";
        }
    });
}

// ================= CHỨC NĂNG: ĐỐI CHIẾU KẾT QUẢ VÀ THƯỞNG ĐIỂM (BẢN GIẢ LẬP) =================
function simulateMatchResult(actualResult) {
    alert(`Hệ thống ghi nhận kết quả thực tế trận đấu là: ${actualResult}. Đang tiến hành quét dữ liệu toàn bộ hệ thống để phát thưởng...`);

    database.ref('users').once('value', snapshot => {
        let allUsers = snapshot.val();
        for(let user in allUsers) {
            let userChoice = allUsers[user].currentPrediction;
            let currentPoints = allUsers[user].points;

            if(userChoice === actualResult) {
                // Đoán đúng thưởng 100 điểm
                database.ref('users/' + user).update({
                    points: currentPoints + 100,
                    currentPrediction: "None" // Reset lượt dự đoán cho trận sau
                });
            } else {
                // Đoán sai không được cộng, reset trạng thái dự đoán
                database.ref('users/' + user).update({
                    currentPrediction: "None"
                });
            }
        }
        alert("Đã kết toán xong! Điểm thưởng của những người đoán đúng đã được cập nhật trực tuyến.");
        loadLeaderboard();
    });
}

// ================= CHỨC NĂNG: TẢI BẢNG XẾP HẠNG TỪ DATABASE CHUNG =================
function loadLeaderboard() {
    database.ref('users').orderByChild('points').limitToLast(10).on('value', snapshot => {
        let tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = "";
        
        let usersList = [];
        snapshot.forEach(childSnapshot => {
            usersList.push({
                name: childSnapshot.key,
                points: childSnapshot.val().points
            });
        });

        // Sắp xếp giảm dần theo điểm
        usersList.reverse();

        if(usersList.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3'>Chưa có người chơi nào đăng ký.</td></tr>";
            return;
        }

        usersList.forEach((user, index) => {
            let row = `<tr>
                <td><strong>${index + 1}</strong></td>
                <td>${user.name}</td>
                <td><span style="color:#eab308;font-weight:bold">${user.points} Xu</span></td>
            </tr>`;
            tbody.innerHTML += row;
        });
    });
}