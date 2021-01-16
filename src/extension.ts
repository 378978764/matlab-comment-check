/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonAction } from './actions';
import { subscribeToDocumentChanges } from './diagnostics';
import { registerCommands } from './utils/commands';

export function activate(context: vscode.ExtensionContext) {
	const matlabCommentDiagnostics = vscode.languages.createDiagnosticCollection("matlabComment");
	context.subscriptions.push(matlabCommentDiagnostics);

	subscribeToDocumentChanges(context, matlabCommentDiagnostics);

	// 注册 QuickFix: 更新函数注释
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('matlab', new CommonAction(), {
			providedCodeActionKinds: CommonAction.providedCodeActionKinds
		})
	);

	// 注册命令
	registerCommands(context)

	// 提示用户
	vscode.window.showInformationMessage('Matlab Comment Checker Plugin activated!')
	
}