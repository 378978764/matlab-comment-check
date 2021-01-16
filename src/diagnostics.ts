import { FunctionCommentAction } from './actions'
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from 'vscode';
import { DiagnosticSeverity } from 'vscode';
import { extractFunctionVariablesWithoutComment, extractVariables, getFunctionCall, VariableItem } from './utils/variables';
import { getHasMapping } from './utils/commentUtils';

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
	const functionCalls = getFunctionCall(doc.getText(), doc.fileName)
	// 变量
	const commonVariables = extractVariables(doc.getText())
	// 函数返回值变量
	const functionCallVaiables = functionCalls.reduce((prev, current) => {
		return prev.concat(current.returns)
	}, [] as VariableItem[])
	// 函数参数
	const functionParamVariables = extractFunctionVariablesWithoutComment(doc.getText())

	// 已经有注释的
	const alreadyMapping = {
		...getHasMapping(commonVariables),
		...getHasMapping(functionCallVaiables),
		...getHasMapping(functionParamVariables)
	}

	// 变量列表
	const variableList: VariableListItem[] = [
		{
			name: '变量',
			code: '',
			variables: commonVariables,
		},
		{
			name: '函数返回值',
			code: '',
			variables: functionCallVaiables,
		},
		{
			name: '函数参数',
			code: FunctionCommentAction.ActionName,
			variables: functionParamVariables,
		},
	]
	
	// 生成一个

	// 生成诊断
	variableList.forEach(v => {
		for (let variable of v.variables) {
			if (!alreadyMapping[variable.name]) {
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