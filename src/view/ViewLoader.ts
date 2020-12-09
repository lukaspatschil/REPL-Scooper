import * as vscode from "vscode";
import * as path from "path";
//@ts-ignore
import { ProgramStatment } from "@typescript-eslint/eslint-plugin";

export default class ViewLoader {
  private readonly _panel: vscode.WebviewPanel | undefined;
  private readonly _extensionPath: string;
  private readonly activeDecorationType = vscode.window.createTextEditorDecorationType(
    {
      backgroundColor: new vscode.ThemeColor("editor.selectionBackground"),
    }
  );

  constructor(
    extensionPath: string,
    code: ProgramStatment,
    global_variables: ProgramStatment[],
    code_string: string,
    range: vscode.Range,
    editor: vscode.TextEditor
  ) {
    this._extensionPath = extensionPath;

    this.decorate(editor, range, this.activeDecorationType);

    this._panel = vscode.window.createWebviewPanel(
      "replWebview",
      "REPL Window",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,

        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "configViewer")),
        ],
      }
    );

    this._panel.webview.html = this.getWebviewContent(
      code,
      global_variables,
      code_string
    );

    this._panel.onDidDispose(() => {
      this.activeDecorationType.dispose();
    });
  }

  private getWebviewContent(
    code: ProgramStatment,
    global_variables: ProgramStatment[],
    code_string: string
  ): string {
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "configViewer", "configViewer.js")
    );
    const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });

    const string_code = JSON.stringify(code);
    const string_global = JSON.stringify(global_variables);
    const more_string = JSON.stringify(code_string);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Config View</title>
				
				<meta http-equiv="Content-Security-Policy"
              content="default-src 'none';
                      img-src https:;
                      script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
											style-src vscode-resource: 'unsafe-inline';">
				<script>
          window.acquireVsCodeApi = acquireVsCodeApi;
          window.code = ${string_code};
          window.global_variables = ${string_global};
          window.code_string = ${more_string};
				</script>
    </head>
    <body>
        <div id="root"></div>

        <script src="${reactAppUri}"></script>
    </body>
    </html>`;
  }

  private decorate(
    editor: vscode.TextEditor,
    range: vscode.Range,
    decoration: vscode.TextEditorDecorationType
  ) {
    editor.setDecorations(decoration, [range]);
  }
}
