import { Range } from 'vscode'
import * as vscode from 'vscode'
import { extractFile, extractFunction, fileCommentToString, functionCommentToString, getCommentRange } from './commentUtils'
import { extractVariablesAll, mergeVariables } from './variables'
import { isFunction } from './reader'

export function updateVariables() {
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const doc = editor.document
    const content = editor.document.getText()
    let newComment: string
    if (isFunction(content)) {
      // 如果是函数
      const res = extractFunction(content)
      // 合并新老
      res.variables = extractVariablesAll(content)
      // 写入编辑器
      newComment = functionCommentToString(res)
    } else {
      // 如果是文件
      const res = extractFile(content)
      // 合并新老
      res.variables = extractVariablesAll(content)
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

export function registerCommands(context: vscode.ExtensionContext) {
  // 更新核心变量
  context.subscriptions.push(vscode.commands.registerCommand(
    'matlabCommentCheck.updateVariables', updateVariables
  ))
}