import { ExtensionContext, Position } from 'vscode'
import { TextDocument } from 'vscode'
import * as vscode from 'vscode'
import * as path from 'path'
import tool from '../utils/tool'
import { getTypeNames, getWorkspaceFolderPath, readConfig } from '../utils/typeReader';
import { readContent } from '../utils/reader'

function toStruct (doc: TextDocument, position: Position) : vscode.Location | null {
    // 当前单词
    const word = doc.getText(doc.getWordRangeAtPosition(position));
    // 当前行
    const line = doc.lineAt(position.line)
    // 判断单词是否是结构体类型
    const pattern = new RegExp(`-->\\s*${word}`)
    if (pattern.test(line.text)) {
        // 该结构体类型是否存在
        const config = readConfig()
        if (config && Object.keys(config).includes(word)) {
            const configItem = config[word]
            const rootPath = getWorkspaceFolderPath()
            const filePath = path.resolve(rootPath, configItem.path) 
            return getPosition(filePath, readContent(filePath), configItem.name)
        } else {
            return null
        }
    }
    return null
}

function getPosition(fileName: string, content: string, word: string) : vscode.Location | null {
    const p = tool.getRowCol(content, word);
    if (p) {
        // Only match current file.
        // The plug-in with the most stars already supports cross-file definition-jump.
        return new vscode.Location(vscode.Uri.file(fileName), new vscode.Position(p.row, p.col))
    }
    return null
}

/**
 * Find the provider defined by the file, return a location if it matches, otherwise it will not be handled
 * @param {*} document current document
 * @param {*} position current position
 */
function provideDefinition(document: TextDocument, position: Position) {
    const fileName = document.fileName;
    const word = document.getText(document.getWordRangeAtPosition(position));
    
    // 如果是结构体类型的跳转
    const structPosition = toStruct(document, position)
    if (structPosition) {
        return structPosition
    }

    // 当前文件变量的跳转
    return getPosition(document.fileName, document.getText(), word)
    
}

export default function (context: ExtensionContext) {
    // 注册如何实现跳转到定义，第一个参数表示仅对json文件生效
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(['matlab'], {
        provideDefinition
    }));
};