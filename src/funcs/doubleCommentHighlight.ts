import * as vscode from 'vscode';

// this method is called when vs code is activated
export default function (context: vscode.ExtensionContext) {

	console.log('decorator sample is activated');

	let timeout: NodeJS.Timer | undefined = undefined;

	// create a decorator type that we use to decorate large numbers
	const doublePercentStart = vscode.window.createTextEditorDecorationType({
		borderColor: 'grey',
		borderWidth: '1px',
		borderStyle: 'solid',
	});

	const doublePercentDoubleEnd = vscode.window.createTextEditorDecorationType({
		dark: {
			backgroundColor: 'green',
			color: 'white',
		},
		light: {
			backgroundColor: 'yellow',
			color: 'black'
		},
		fontWeight: 'bold'
	})

	let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations() {
		if (!activeEditor) {
			return;
		}

		// 以双百分比号开头
		let regEx = /%%.+/g;
		let text = activeEditor.document.getText();
		let doublePercents: vscode.DecorationOptions[] = [];
		let match;
		while ((match = regEx.exec(text))) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const decoration = { range: new vscode.Range(startPos, endPos) };
			doublePercents.push(decoration);
		}
		activeEditor.setDecorations(doublePercentStart, doublePercents);

		// 以双百分开头，并以双百分比号结尾
		regEx = /%%.+%%/g;
		text = activeEditor.document.getText();
		const doubleEndPercents: vscode.DecorationOptions[] = [];
		while ((match = regEx.exec(text))) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const decoration = { range: new vscode.Range(startPos, endPos) };
			doubleEndPercents.push(decoration);
		}
		activeEditor.setDecorations(doublePercentDoubleEnd, doubleEndPercents);
		
	}

	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

}

