import { FunctionCommentAction } from './actions'
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from 'vscode';
import { DiagnosticSeverity } from 'vscode';
import { extractFunctionVariablesWithoutComment, extractVariables, getFunctionCall, VariableItem } from './utils/variables';

const SOURCE = 'Matlab Comment Checker'

type VariableListItem = {
	name: string,
	code: string,
	variables: VariableItem[]
}

/**
 * Analyzes the text document for problems. 
 * This demo diagnostic problem provider finds all mentions of 'emoji'.
 * @param doc text document to analyze
 * @param matlabDiagnostics diagnostic collection
 */
export function refreshDiagnostics(doc: vscode.TextDocument, matlabDiagnostics: vscode.DiagnosticCollection): void {
	// 仅仅对 matlab 文件提出诊断
	if (doc.languageId !== 'matlab') {
		return
	}

	const diagnostics: vscode.Diagnostic[] = [];
	const functionCalls = getFunctionCall(doc.getText())

	// 变量列表
	const variableList: VariableListItem[] = [
		{
			name: '变量',
			code: '',
			variables: extractVariables(doc.getText()),
		},
		{
			name: '函数返回值',
			code: '',
			variables: functionCalls.reduce((prev, current) => {
				return prev.concat(current.returns)
			}, [] as VariableItem[]),
		},
		{
			name: '函数参数',
			code: FunctionCommentAction.ActionName,
			variables: extractFunctionVariablesWithoutComment(doc.getText()),
		},
	]

	// 生成诊断
	variableList.forEach(v => {
		for (let variable of v.variables) {
			if (variable.value === '') {
				diagnostics.push({
					severity: DiagnosticSeverity.Warning,
					range: new vscode.Range(
						doc.positionAt(variable.range.start),
						doc.positionAt(variable.range.end)
					),
					message: `${v.name} ${variable.name} 没有注释`,
					source: SOURCE,
					code: v.code
				})
			}
		}
	})

	matlabDiagnostics.set(doc.uri, diagnostics);
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, matlabDiagnostics: vscode.DiagnosticCollection): void {
	// 刚开始
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, matlabDiagnostics);
	}

	// 活动编辑器改变
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, matlabDiagnostics);
			}
		})
	);

	// 文档改变
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, matlabDiagnostics))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => matlabDiagnostics.delete(doc.uri))
	);

}