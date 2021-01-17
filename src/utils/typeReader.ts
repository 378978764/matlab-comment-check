import { Range } from 'vscode'
import * as fs from 'fs'
import * as vscode from 'vscode'
import * as path from 'path'
import { getMembers } from './variables'

interface Config {
  [key: string]: {
    path: string,
    name: string
  }
}

export function getWorkspaceFolderPath() {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders) {
    const workspaceFolder = workspaceFolders.map(v => v.uri.fsPath)[0]
    return workspaceFolder
  } else {
    return ''
  }
}

function getConfigFilePath () : string | null {
  const CONFIG_NAME = 'types.json'
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders) {
    const workspaceFolder = workspaceFolders.map(v => v.uri.fsPath)[0]
    const filePath = path.join(workspaceFolder, CONFIG_NAME)
    return filePath
  } else {
    console.warn(`尚未打开 workspace`)
    return null
  }
}

/**
 * 读取配置
 */
export function readConfig(): Config | null {
  const filePath = getConfigFilePath()
  if (filePath && fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath).toString()
      if (content === '') {
        return {}
      }
      return JSON.parse(content) as Config
    } catch {
      const message = `类型配置文件读取失败: ${filePath}`
      console.warn(message)
      vscode.window.showErrorMessage(message)
      return null
    }
  } else {
    // 创建一个新的
    if (filePath) {
      fs.writeFileSync(filePath, '{}')
      return readConfig()
    } else {
      const message = `类型配置文件不存在: ${filePath}`
      console.warn(message)
      vscode.window.showErrorMessage(message)
    }
    return null
  }
}

export async function saveConfig (config: Config) {
  // 查看当前是否打开这个文件
  const filePath = getConfigFilePath()
  // 首先清空
  if (filePath && fs.existsSync(filePath)) {
    // 打开配置文件
    const doc = await vscode.workspace.openTextDocument(filePath)
    await vscode.window.showTextDocument(doc)
    // 生成新的配置文件内容
    const content = doc.getText()
    let newContent = JSON.stringify(config, null, 2)
    // 反斜杠要转义
    newContent = newContent.replace(/\\/g, '\\\\')
    // 获取到活动编辑器
    const editor = vscode.window.activeTextEditor
    if (editor) {
      await editor.edit(async editBuilder => {
        // 清空
        const range = new Range(
          doc.positionAt(0),
          doc.positionAt(content.length)
        )
        editBuilder.replace(range, '')
      })
      // 插入新的
      editor.insertSnippet(new vscode.SnippetString(newContent), doc.positionAt(0))
    }
  }
}


/**
 * 获取类型名称数组
 */
export function getTypeNames () : string[] {
  const config = readConfig()
  if (config) {
    return Object.keys(config)
  } else {
    return []
  }
}

/**
 * 根据类型名称获取类型的成员变量
 * @param typeName 类型名称
 */
export function getTypeMembers(typeName: string): string[] {
  const config = readConfig()
  if (config) {
    const item = config[typeName]
    if (item) {
      const { path, name } = item
      return getMembers(path, name)
    } else {
      return []
    }
  } else {
    return []
  }
}