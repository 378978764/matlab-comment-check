import * as fs from 'fs'
import * as vscode from 'vscode'
import * as path from 'path'
import { getMembers } from './variables'

interface Config {
  struct: {
    [key: string]: {
      path: string,
      name: string
    }
  }
}

function readConfig  () : Config | null {
  const CONFIG_NAME = 'types.json'
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders) {
    const workspaceFolder = workspaceFolders.map(v => v.uri.fsPath)[0]
    const filePath = path.join(workspaceFolder, CONFIG_NAME)
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath).toString()) as Config
      } catch {
        console.warn(`类型配置文件读取失败: ${filePath}`)
        return null
      }
    } else {
      console.warn(`类型配置文件不存在: ${filePath}`)
      return null
    }
  } else {
    console.warn(`尚未打开 workspace`)
    return null
  }
}

export function getTypeMembers (typeName: string) : string[] {
  const config = readConfig()
  if (config) {
    const item = config.struct[typeName]
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