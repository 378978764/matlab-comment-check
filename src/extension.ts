/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { FunctionCommentAction } from './actions';
import { subscribeToDocumentChanges } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
	const matlabCommentDiagnostics = vscode.languages.createDiagnosticCollection("matlabComment");
	context.subscriptions.push(matlabCommentDiagnostics);

	subscribeToDocumentChanges(context, matlabCommentDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('matlab', new FunctionCommentAction(), {
			providedCodeActionKinds: FunctionCommentAction.providedCodeActionKinds
		})
	);
}