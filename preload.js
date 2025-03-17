import { contextBridge } from 'electron';
import path from 'path';

const appPath = process.env.ELECTRON_RENDERER_URL || process.resourcesPath || __dirname;
const isPackaged = !process.env.ELECTRON_RENDERER_URL;

// Expose minimal electron API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  isPackaged,
  appPath,
  resourcesPath: process.resourcesPath,
}); 