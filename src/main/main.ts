import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { CopilotClient, CopilotSession } from '@github/copilot-sdk'
import Store from 'electron-store'

const store = new Store({
  defaults: {
    model: 'gpt-5'
  }
})

let mainWindow: BrowserWindow | null = null
let copilotClient: CopilotClient | null = null
let session: CopilotSession | null = null
let currentModel: string = store.get('model') as string

const AVAILABLE_MODELS = [
  'gpt-5',
  'claude-sonnet-4.5',
  'claude-sonnet-4',
  'gpt-4.1',
]

async function initCopilot(): Promise<void> {
  try {
    console.log('Initializing Copilot SDK...')
    copilotClient = new CopilotClient()
    await copilotClient.start()
    console.log('Copilot client started')

    session = await copilotClient.createSession({
      model: currentModel,
    })
    console.log('Copilot session created with model:', currentModel)

    // Set up event handler for streaming responses
    session.on((event) => {
      if (!mainWindow || mainWindow.isDestroyed()) return

      console.log('Session event:', event.type, JSON.stringify(event.data || {}).substring(0, 200))

      if (event.type === 'assistant.message_delta') {
        mainWindow.webContents.send('copilot:delta', event.data.deltaContent)
      } else if (event.type === 'assistant.message') {
        console.log('Final message received, length:', event.data.content?.length)
        mainWindow.webContents.send('copilot:message', event.data.content)
      } else if (event.type === 'session.idle') {
        console.log('Session idle - processing complete')
        mainWindow.webContents.send('copilot:idle')
      } else if (event.type === 'tool.execution_start') {
        console.log('Tool start:', event.data)
        mainWindow.webContents.send('copilot:tool-start', event.data)
      } else if (event.type === 'tool.execution_end') {
        console.log('Tool end:', event.data)
        mainWindow.webContents.send('copilot:tool-end', event.data)
      } else if (event.type === 'session.error') {
        console.log('Session error:', event.data)
        // Don't treat retryable errors as fatal
      }
    })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('copilot:ready', { model: currentModel, models: AVAILABLE_MODELS })
    }
  } catch (err) {
    console.error('Failed to initialize Copilot:', err)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('copilot:error', String(err))
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 },
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.once('did-finish-load', () => {
    initCopilot()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle('copilot:send', async (_event, prompt: string) => {
  if (!session) {
    throw new Error('Copilot session not initialized')
  }
  console.log('Sending message:', prompt)
  const messageId = await session.send({ prompt })
  return messageId
})

ipcMain.handle('copilot:sendAndWait', async (_event, prompt: string) => {
  if (!session) {
    throw new Error('Copilot session not initialized')
  }
  console.log('Sending message and waiting:', prompt)
  const response = await session.sendAndWait({ prompt })
  return response?.data?.content || ''
})

ipcMain.on('copilot:abort', async () => {
  if (session) {
    await session.abort()
  }
})

ipcMain.handle('copilot:setModel', async (_event, model: string) => {
  if (!AVAILABLE_MODELS.includes(model)) {
    throw new Error(`Invalid model: ${model}`)
  }
  
  console.log('Switching model to:', model)
  currentModel = model
  store.set('model', model) // Persist selection
  
  // Recreate session with new model
  if (session) {
    await session.destroy()
  }
  
  if (copilotClient) {
    session = await copilotClient.createSession({
      model: currentModel,
    })
    
    session.on((event) => {
      if (!mainWindow || mainWindow.isDestroyed()) return

      console.log('Session event:', event.type, JSON.stringify(event.data || {}).substring(0, 200))

      if (event.type === 'assistant.message_delta') {
        mainWindow.webContents.send('copilot:delta', event.data.deltaContent)
      } else if (event.type === 'assistant.message') {
        console.log('Final message received, length:', event.data.content?.length)
        mainWindow.webContents.send('copilot:message', event.data.content)
      } else if (event.type === 'session.idle') {
        console.log('Session idle - processing complete')
        mainWindow.webContents.send('copilot:idle')
      } else if (event.type === 'tool.execution_start') {
        console.log('Tool start:', event.data)
        mainWindow.webContents.send('copilot:tool-start', event.data)
      } else if (event.type === 'tool.execution_end') {
        console.log('Tool end:', event.data)
        mainWindow.webContents.send('copilot:tool-end', event.data)
      } else if (event.type === 'session.error') {
        console.log('Session error:', event.data)
      }
    })
  }
  
  return { model: currentModel }
})

ipcMain.handle('copilot:getModels', async () => {
  return { models: AVAILABLE_MODELS, current: currentModel }
})

ipcMain.handle('copilot:reset', async () => {
  if (session) {
    await session.destroy()
  }
  if (copilotClient) {
    session = await copilotClient.createSession({
      model: 'gpt-5',
    })
    
    session.on((event) => {
      if (!mainWindow || mainWindow.isDestroyed()) return

      if (event.type === 'assistant.message_delta') {
        mainWindow.webContents.send('copilot:delta', event.data.deltaContent)
      } else if (event.type === 'assistant.message') {
        mainWindow.webContents.send('copilot:message', event.data.content)
      } else if (event.type === 'session.idle') {
        mainWindow.webContents.send('copilot:idle')
      }
    })
  }
})

// Window control handlers
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window:close', () => {
  mainWindow?.close()
})

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  if (session) {
    await session.destroy()
    session = null
  }
  if (copilotClient) {
    await copilotClient.stop()
    copilotClient = null
  }
  app.quit()
})

app.on('before-quit', async () => {
  if (session) {
    await session.destroy()
    session = null
  }
  if (copilotClient) {
    await copilotClient.stop()
    copilotClient = null
  }
})

