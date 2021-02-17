/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonAction } from './funcs/actions';
import { subscribeToDocumentChanges } from './funcs/diagnostics';
import { registerCommands } from './utils/commands';
import completion from './funcs/completion'
import jumpToDefinition from './funcs/jumpToDefinition'
import rename from './funcs/rename'
import doubleCommentHighlight from './funcs/doubleCommentHighlight'

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

	// 代码自动补全
	completion(context)
	// 定义跳转
	jumpToDefinition(context)
	// 变量重命名
	rename(context)
	// 双百分比号高亮
	doubleCommentHighlight(context)

	// 提示用户
	vscode.window.showInformationMessage('Matlab Comment Checker Plugin activated!')
	
}