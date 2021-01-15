import { FunctionCommentAction } from './actions'
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from 'vscode';
import { DiagnosticSeverity } from 'vscode';
import { extractFunctionVariablesWithoutComment, extractVariables } from './utils/variables';

const SOURCE = 'Matlab Comment Checker'

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
	// 代码主体中的变量
	const variables = extractVariables(doc.getText())
	for (let variable of variables) {
		if (variable.value === '') {
			// value is empty
			let diagnostic: vscode.Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: new vscode.Range(doc.positionAt(variable.range.start), doc.positionAt(variable.range.end)),
				message: `变量 ${variable.name} 没有注释`,
				source: SOURCE,
			}
			// 加入到结果
			diagnostics.push(diagnostic)
		}
	}
	
	// function 那一行的变量
	const functionVariabels = extractFunctionVariablesWithoutComment(doc.getText())
	for (let variable of functionVariabels) {
		diagnostics.push({
			severity: DiagnosticSeverity.Warning,
			range: new vscode.Range(
				doc.positionAt(variable.range.start),
				doc.positionAt(variable.range.end)
			),
			message: `函数参数 ${variable.name} 没有注释`,
			source: SOURCE,
			code: FunctionCommentAction.ActionName
		})
	}

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