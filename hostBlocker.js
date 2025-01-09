const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const HOSTS_PATH = process.platform === 'win32' 
    ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
    : '/etc/hosts';

class HostBlocker {
    constructor() {
        this.blockedSites = new Set();
    }

    async loadBlockedSites(userId) {
        try {
            const response = await fetch(`https://backend-production-311e.up.railway.app/api/access/user/${userId}`);
            const data = await response.json();

            if (data.success) {
                this.blockedSites.clear();
                data.data.forEach(site => {
                    if (site.status === 'active') {
                        // Thêm cả www. và không www.
                        const domain = this.normalizeDomain(site.address);
                        this.blockedSites.add(domain);
                        this.blockedSites.add(`www.${domain}`);
                    }
                });
                await this.updateHostsFile();
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách trang web bị chặn:', error);
        }
    }

    normalizeDomain(url) {
        url = url.toLowerCase();
        url = url.replace(/^https?:\/\//i, '');
        url = url.replace(/^www\./i, '');
        url = url.split('/')[0];
        return url;
    }

    async readHostsFile() {
        try {
            const content = await fs.readFile(HOSTS_PATH, 'utf8');
            return content;
        } catch (error) {
            console.error('Lỗi khi đọc file hosts:', error);
            return '';
        }
    }

    async updateHostsFile() {
        try {
            // Đọc nội dung hiện tại của file hosts
            let hostsContent = await this.readHostsFile();
            
            // Tìm và xóa phần Guardian block cũ
            hostsContent = this.removeGuardianBlock(hostsContent);

            // Thêm phần Guardian block mới
            if (this.blockedSites.size > 0) {
                hostsContent += '\n# Guardian Block Start\n';
                for (const site of this.blockedSites) {
                    hostsContent += `127.0.0.1 ${site}\n`;
                }
                hostsContent += '# Guardian Block End\n';
            }

            // Lưu file với quyền admin
            await this.writeHostsFileWithAdmin(hostsContent);

            // Flush DNS cache
            await this.flushDNS();

        } catch (error) {
            console.error('Lỗi khi cập nhật file hosts:', error);
            throw error;
        }
    }

    removeGuardianBlock(content) {
        const lines = content.split('\n');
        const startIndex = lines.findIndex(line => line.includes('# Guardian Block Start'));
        const endIndex = lines.findIndex(line => line.includes('# Guardian Block End'));

        if (startIndex !== -1 && endIndex !== -1) {
            lines.splice(startIndex, endIndex - startIndex + 1);
        }

        return lines.join('\n');
    }

    async writeHostsFileWithAdmin(content) {
        try {
            // Tạo PowerShell script
            const psScriptPath = path.join(__dirname, 'update_hosts.ps1');
            const psScript = `
$hosts_file = "${HOSTS_PATH}"
$content = @'
${content}
'@

# Backup hosts file
Copy-Item $hosts_file "$hosts_file.bak" -Force

# Write new content
Set-Content -Path $hosts_file -Value $content -Force

# Flush DNS
ipconfig /flushdns
            `;

            await fs.writeFile(psScriptPath, psScript, 'utf8');

            // Thực thi PowerShell script với quyền admin
            const command = `powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`;
            await execAsync(command);

            // Xóa script sau khi thực thi
            await fs.unlink(psScriptPath);

            console.log('Đã cập nhật file hosts thành công');
        } catch (error) {
            console.error('Lỗi khi cập nhật file hosts:', error);
            throw error;
        }
    }

    async flushDNS() {
        try {
            if (process.platform === 'win32') {
                await execAsync('ipconfig /flushdns');
            } else {
                await execAsync('sudo killall -HUP mDNSResponder');
            }
            console.log('Đã flush DNS cache');
        } catch (error) {
            console.error('Lỗi khi flush DNS:', error);
        }
    }

    async checkHostsFile() {
        try {
            const content = await this.readHostsFile();
            console.log('Nội dung file hosts hiện tại:', content);
            return content;
        } catch (error) {
            console.error('Lỗi khi kiểm tra file hosts:', error);
            return null;
        }
    }
}

module.exports = HostBlocker; 