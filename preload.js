const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
        invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    },
    getHistory: (browser) => {
        if (browser === 'chrome') {
            return ipcRenderer.invoke('get-chrome-history');
        } else if (browser === 'edge') {
            return ipcRenderer.invoke('get-edge-history');
        }
    },
    send: (channel, data) => {
        // whitelist channels
        let validChannels = ['user-logged-in'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    }
});