const { app, BrowserWindow, session, ipcMain, desktopCapturer } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let lockWindow;
let blockedGames = []; // Mảng để lưu danh sách game bị chặn

// Đọc danh sách game bị chặn từ file
const loadBlockedGames = () => {
    const filePath = path.join(__dirname, 'blockedGames.txt');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading blocked games file:', err);
            return;
        }

        const lines = data.split('\n');
        lines.forEach(line => {
            const [gameName, status] = line.split(',');
            if (status.trim() === 'block') {
                blockedGames.push(gameName.trim());
            }
        });
        console.log('Danh sách game bị chặn:', blockedGames);
        // Gửi danh sách game bị chặn đến trang blockGame.html
        if (mainWindow) {
            mainWindow.webContents.send('update-blocked-games', blockedGames);
        }
    });
};

app.on('ready', () => {
    // Tải danh sách game bị chặn
    loadBlockedGames();

    // Tạo cửa sổ chính của ứng dụng
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Tải giao diện đăng nhập
    mainWindow.loadFile('pages/login/login.html');

    // Gỡ bỏ proxy (thiết lập lại thành mặc định)
    const ses = session.defaultSession;
    ses.setProxy({}).then(() => {
        console.log('Proxy disabled!');
    }).catch(err => {
        console.error('Error disabling proxy:', err);
    });

    // In ra tất cả tiến trình đang chạy
    exec('tasklist', (error, stdout, stderr) => {
        if (error) {
            console.error('Error fetching task list:', error);
            return;
        }

        console.log('Danh sách tất cả tiến trình đang chạy:');
        const processes = stdout.split('\n').slice(3); // Bỏ qua 3 dòng đầu tiên
        processes.forEach(process => {
            const processInfo = process.trim().split(/\s+/); // Tách thông tin
            if (processInfo.length > 0) {
                const processName = processInfo[0]; // Tên tiến trình
                const processId = processInfo[1]; // PID
                console.log(`- ${processName} (PID: ${processId})`);

                // Kiểm tra xem tiến trình có nằm trong danh sách game bị chặn không
                if (blockedGames.some(game => processName.toLowerCase().includes(game.toLowerCase()))) {
                    console.log(`Chặn game "${processName}" đang chạy.`);
                    exec(`taskkill /F /IM ${processName}`, (err) => {
                        if (err) {
                            console.error(`Không thể chặn game "${processName}": ${err.message}`);
                        } else {
                            console.log(`Game "${processName}" đã bị chặn.`);
                        }
                    });
                }
            }
        });
    });

    // Đăng ký handler cho sự kiện 'capture-screen'
    ipcMain.handle('capture-screen', async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources; // Trả về danh sách các nguồn màn hình
    });

    // Đăng ký handler để lấy lịch sử
    ipcMain.handle('get-chrome-history', async () => {
        return getChromeHistory();
    });

    ipcMain.handle('get-edge-history', async () => {
        return getEdgeHistory();
    });

    // Đăng ký handler để khóa máy tính
    ipcMain.on('lock-computer', () => {
        if (lockWindow) {
            lockWindow.focus(); // Nếu cửa sổ khóa đã mở, chỉ cần lấy tiêu điểm
        } else {
            lockWindow = new BrowserWindow({
                width: 800,
                height: 600,
                fullscreen: true,
                frame: false,
                alwaysOnTop: true,
                webPreferences: {
                    contextIsolation: true,
                    nodeIntegration: false,
                }
            });

            lockWindow.loadFile('pages/lockScreen.html'); // Tạo file lockScreen.html

            // Đảm bảo rằng khi cửa sổ khóa bị đóng, biến lockWindow được đặt lại
            lockWindow.on('closed', () => {
                lockWindow = null; // Đặt lại lockWindow khi nó bị đóng
            });
        }
    });

    // Đăng ký handler để lập lịch khóa mạng
    ipcMain.on('schedule-network-lock', (event, lockTime) => {
        const lockDate = new Date(lockTime);
        const now = new Date();
        const timeToLock = lockDate.getTime() - now.getTime();

        if (timeToLock > 0) {
            console.log(`Mạng sẽ được khóa vào lúc ${lockDate}`);
            setTimeout(() => {
                // Thực hiện khóa mạng ở đây
                exec('netsh interface set interface "Wi-Fi" admin=disabled', (err) => {
                    if (err) {
                        console.error('Không thể khóa mạng:', err);
                    } else {
                        console.log('Mạng đã bị khóa.');
                    }
                });
            }, timeToLock);
        } else {
            console.log('Thời gian khóa phải trong tương lai.');
        }
    });

    // Đăng ký handler để chặn game
    ipcMain.on('block-game', (event, gameName) => {
        blockedGames.push(gameName);
        console.log(`Chặn game "${gameName}"`);

        // Kiểm tra tiến trình hệ thống và tìm game
        setInterval(() => {
            exec('tasklist', (error, stdout, stderr) => {
                if (error) {
                    console.error('Error fetching task list:', error);
                    return;
                }

                // Kiểm tra xem game có đang chạy không
                if (stdout.toLowerCase().includes(gameName.toLowerCase())) {
                    console.log(`Tìm thấy game "${gameName}" đang chạy.`);
                    exec(`taskkill /F /IM ${gameName}.exe`, (err) => {
                        if (err) {
                            console.error(`Không thể chặn game "${gameName}": ${err.message}`);
                        } else {
                            console.log(`Game "${gameName}" đã bị chặn.`);
                        }
                    });
                }
            });
        }, 5000); // Kiểm tra mỗi 5 giây
    });

    // Đăng ký handler để mở lại mạng
    ipcMain.on('enable-network', () => {
        exec('netsh interface set interface "Tên_Giao_Diện_Của_Bạn" admin=enabled', (err) => {
            if (err) {
                console.error('Không thể mở lại mạng:', err);
            } else {
                console.log('Mạng đã được mở lại.');
            }
        });
    });
});

// Đọc lịch sử từ tệp lịch sử của Chrome
const getChromeHistory = () => {
    return new Promise((resolve, reject) => {
        // Tự động xác định đường dẫn đến tệp lịch sử của Chrome
        let chromeHistoryPath;
        const platform = process.platform;

        // Đường dẫn cho Windows
        if (platform === 'win32') {
            chromeHistoryPath = path.join(
                process.env.LOCALAPPDATA || process.env.APPDATA,
                'Google', 'Chrome', 'User Data', 'Default', 'History'
            );
        }
        // Đường dẫn cho macOS
        else if (platform === 'darwin') {
            chromeHistoryPath = path.join(
                process.env.HOME,
                'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'History'
            );
        }
        // Đường dẫn cho Linux
        else if (platform === 'linux') {
            chromeHistoryPath = path.join(
                process.env.HOME,
                '.config', 'google-chrome', 'Default', 'History'
            );
        }
        // Nếu không hỗ trợ nền tảng
        else {
            return reject('Unsupported platform: ' + platform);
        }

        console.log('Chrome history path:', chromeHistoryPath); // Log đường dẫn

        // Tạo đường dẫn tạm thời trong thư mục của project
        const backupHistoryPath = path.join(__dirname, 'backup_History');

        // Sao chép tệp lịch sử vào thư mục backup
        copyFile(chromeHistoryPath, backupHistoryPath)
            .then(() => {
                console.log('History file copied to backup!');

                // Mở cơ sở dữ liệu SQLite từ tệp sao lưu
                const db = new sqlite3.Database(backupHistoryPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err) {
                        return reject('Error opening SQLite database: ' + err.message);
                    }
                });

                // Truy vấn dữ liệu lịch sử
                const query = `
                    SELECT urls.url, urls.title, urls.last_visit_time
                    FROM urls
                    ORDER BY last_visit_time DESC
                    LIMIT 100;
                `;

                db.all(query, [], (err, rows) => {
                    if (err) {
                        return reject('Error querying database: ' + err.message);
                    }

                    // Đóng cơ sở dữ liệu
                    db.close();

                    // Xử lý dữ liệu lịch sử và trả về kết quả
                    const history = rows.map(row => {
                        const timestamp = (row.last_visit_time - 11644473600000000) / 1000;
                        const date = new Date(timestamp).toISOString(); // Changed to ISO format

                        return {
                            url: row.url,
                            title: row.title,
                            date: date
                        };
                    });

                    resolve(history);
                });
            })
            .catch((err) => {
                reject('Error copying history file: ' + err.message);
            });
    });
};

// Đọc lịch sử từ tệp lịch sử của Edge
const getEdgeHistory = () => {
    return new Promise((resolve, reject) => {
        // Tương tự như getChromeHistory nhưng với đường dẫn đến lịch sử của Edge
        let edgeHistoryPath;
        const platform = process.platform;

        // Đường dẫn cho Windows
        if (platform === 'win32') {
            edgeHistoryPath = path.join(
                process.env.LOCALAPPDATA || process.env.APPDATA,
                'Microsoft', 'Edge', 'User Data', 'Default', 'History'
            );
        }
        // Đường dẫn cho macOS
        else if (platform === 'darwin') {
            edgeHistoryPath = path.join(
                process.env.HOME,
                'Library', 'Application Support', 'Microsoft', 'Edge', 'Default', 'History'
            );
        }
        // Đường dẫn cho Linux
        else if (platform === 'linux') {
            edgeHistoryPath = path.join(
                process.env.HOME,
                '.config', 'microsoft-edge', 'Default', 'History'
            );
        }
        // Nếu không hỗ trợ nền tảng
        else {
            return reject('Unsupported platform: ' + platform);
        }

        console.log('Edge history path:', edgeHistoryPath); // Log đường dẫn

        // Tạo đường dẫn tạm thời trong thư mục của project
        const backupHistoryPath = path.join(__dirname, 'backup_History');

        // Sao chép tệp lịch sử vào thư mục backup
        copyFile(edgeHistoryPath, backupHistoryPath)
            .then(() => {
                console.log('Edge history file copied to backup!');

                // Mở cơ sở dữ liệu SQLite từ tệp sao lưu
                const db = new sqlite3.Database(backupHistoryPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err) {
                        return reject('Error opening SQLite database: ' + err.message);
                    }
                });

                // Truy vấn dữ liệu lịch sử
                const query = `
                    SELECT urls.url, urls.title, urls.last_visit_time
                    FROM urls
                    ORDER BY last_visit_time DESC
                    LIMIT 100;
                `;

                db.all(query, [], (err, rows) => {
                    if (err) {
                        return reject('Error querying database: ' + err.message);
                    }

                    // Đóng cơ sở dữ liệu
                    db.close();

                    // Xử lý dữ liệu lịch sử và trả về kết quả
                    const history = rows.map(row => {
                        const timestamp = (row.last_visit_time - 11644473600000000) / 1000;
                        const date = new Date(timestamp).toISOString(); // Changed to ISO format

                        return {
                            url: row.url,
                            title: row.title,
                            date: date
                        };
                    });

                    resolve(history);
                });
            })
            .catch((err) => {
                reject('Error copying history file: ' + err.message);
            });
    });
};

// Hàm sao chép tệp
const copyFile = (source, destination) => {
    return new Promise((resolve, reject) => {
        fs.copyFile(source, destination, (err) => {
            if (err) {
                return reject('Error copying file: ' + err.message);
            }
            resolve();
        });
    });
};

// Hàm để mở cửa sổ khóa
function createLockWindow() {
    lockWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    lockWindow.loadFile('pages/lockScreen.html');
}
