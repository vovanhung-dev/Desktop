const fs = require('fs');
const path = require('path');

// Đường dẫn đến tệp hosts
const hostsPath = path.join('C:', 'Windows', 'System32', 'drivers', 'etc', 'hosts');

// Quy tắc chặn trang web
const blockRule = '\n127.0.0.1 www.facebook.com';

// Thêm quy tắc vào tệp hosts
fs.appendFile(hostsPath, blockRule, (err) => {
    if (err) {
        console.error('Error updating hosts file:', err);
        return;
    }
    console.log('Web blocked!');
}); 