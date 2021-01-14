import { Range } from 'vscode'
import * as vscode from 'vscode'
import { extractFile, extractFunction, fileCommentToString, functionCommentToString, getCommentRange } from './commentUtils'
import { extractVariables, mergeVariables } from './variables'
import { isFunction } from './reader'

function updateVariables(filePath: string) {
  console.log('进入函数')
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const doc = editor.document
    const content = editor.document.getText()
    let newComment: string
    if (isFunction(content)) {
      // 如果是函数
      const res = extractFunction(content)
      const variables = extractVariables(content)
      // 合并新老
      res.variables = mergeVariables(res.variables, variables)
      // 写入编辑器
      newComment = functionCommentToString(res)
    } else {
      // 如果是文件
      const res = extractFile(content)
      const variables = extractVariables(content)
      // 合并新老
      res.variables = mergeVariables(res.variables, variables)
      // 写入编辑器
      newComment = fileCommentToString(res)
    }
    const rangeXY = getCommentRange(content)
    console.log('更新核心变量', rangeXY, newComment)
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
  const prefix = 'matlabCommentCheck.'
  const commands = [updateVariables]
  for (let fun of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(
      prefix + fun.name, fun
    ))
  }
}