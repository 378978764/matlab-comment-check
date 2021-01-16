import { Range } from 'vscode'
import * as vscode from 'vscode'
import { extractFile, extractFunction, fileCommentToString, functionCommentToString, getCommentRange } from './commentUtils'
import { extractVariablesAll, mergeVariables } from './variables'
import { isFunction } from './reader'
import { readConfig, saveConfig } from './typeReader'

export enum COMMANDS {
  UPDATE_VARIABLES = 'matlabCommentCheck.updateVariables',
  INSERT_TYPE = 'matlabCommentCheck.insertType'
}

export function updateVariables() {
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const doc = editor.document
    const fileName = doc.fileName
    const content = editor.document.getText()
    let newComment: string
    if (isFunction(content)) {
      // 如果是函数
      const res = extractFunction(content)
      // 合并新老
      res.variables = extractVariablesAll(content, fileName)
      // 写入编辑器
      newComment = functionCommentToString(res)
    } else {
      // 如果是文件
      const res = extractFile(content)
      // 合并新老
      res.variables = extractVariablesAll(content, fileName)
      // 写入编辑器
      newComment = fileCommentToString(res)
    }
    const rangeXY = getCommentRange(content)
    editor.edit(editBuilder => {
      const range = new Range(
        doc.positionAt(rangeXY.start),
        doc.positionAt(rangeXY.end)
      )
      editBuilder.replace(range, newComment)
    })
  } else {
    vscode.window.showWarningMessage('当前未打开 matlab 文件')
  }
}

function insertType (name: string) {
  const config = readConfig()
  if (config) {
    config[name] = {
      path: '$1',
      name: '$2'
    }
    saveConfig(config)
  }
}

export function registerCommands(context: vscode.ExtensionContext) {
  // 更新核心变量
  context.subscriptions.push(vscode.commands.registerCommand(
    COMMANDS.UPDATE_VARIABLES, updateVariables
  ))
  // 类型文件中插入类型
  context.subscriptions.push(vscode.commands.registerCommand(
    COMMANDS.INSERT_TYPE, insertType
  ))
}