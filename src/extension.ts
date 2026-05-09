import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('arch-viz.visualize', () => {
        const panel = vscode.window.createWebviewPanel(
            'archViz',
            'Project Architecture',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))]
            }
        );

        const projectData = getProjectStructure();
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, projectData);
    });

    context.subscriptions.push(disposable);
}

function getProjectStructure() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return { name: 'No workspace', children: [] };
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    return walk(rootPath);
}

function walk(dir: string): any {
    const name = path.basename(dir);
    const stats = fs.statSync(dir);
    const node: any = { name, path: dir };

    if (stats.isDirectory()) {
        node.type = 'directory';
        // Exclude common heavy directories
        const exclude = ['node_modules', '.git', 'out', 'dist', '.gemini'];
        node.children = fs.readdirSync(dir)
            .filter(child => !exclude.includes(child))
            .map(child => walk(path.join(dir, child)));
    } else {
        node.type = 'file';
        node.size = stats.size;
        node.extension = path.extname(dir);
    }

    return node;
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, data: any) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'style.css'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Visualization</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="app">
        <header>
            <h1>Project Architecture</h1>
            <div class="stats">
                <span id="file-count">Scanning...</span>
            </div>
        </header>
        <div id="viz-container">
            <canvas id="viz-canvas"></canvas>
        </div>
        <div id="details-panel" class="hidden">
            <h2 id="node-name"></h2>
            <p id="node-path"></p>
            <div id="node-info"></div>
        </div>
    </div>
    <script>
        window.projectData = ${JSON.stringify(data)};
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
