//@ts-ignore
import { ProgramStatment } from "@typescript-eslint/eslint-plugin";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { join } from "path";
import * as vscode from "vscode";
import { getRange } from "../utils";

export default class ViewLoader {
  private readonly _panel: vscode.WebviewPanel | undefined;
  private readonly _extensionPath: string;
  private readonly _activeFolder: readonly vscode.WorkspaceFolder[] | undefined;
  private readonly activeDecorationType = vscode.window.createTextEditorDecorationType(
    {
      backgroundColor: "green",
    }
  );

  constructor(
    extensionPath: string,
    code: ProgramStatment,
    global_variables: ProgramStatment[],
    code_string: string,
    editor: vscode.TextEditor,
    active_folder: readonly vscode.WorkspaceFolder[] | undefined
  ) {
    this._extensionPath = extensionPath;

    this._activeFolder = active_folder ?? undefined;

    const ranges: vscode.Range[] = [getRange(code)];
    this.decorate(editor, ranges, this.activeDecorationType);

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

    this._panel.webview.onDidReceiveMessage(({ command, value }) => {
      switch (command) {
        case "SaveIt":
          this.saveFileContent(value);
          return;
      }
    });

    // remove the text decoration on the selected function / code segment
    this._panel.onDidDispose(() => {
      this.activeDecorationType.dispose();
    });
  }

  updateWebviewContent(
    code: ProgramStatment,
    global_variables: ProgramStatment[],
    code_string: string
  ) {
    // send new message to the webview with the updated values
    if (this._panel) {
      this._panel.webview.postMessage({
        code,
        global_variables,
        code_string,
      });
    }
  }

  private saveFileContent(data: string) {
    const folder = this._activeFolder ?? [];

    const fullPath = join(folder[0].uri.fsPath, ".vscode");

    try {
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath);
      }

      writeFileSync(join(fullPath, "generated.js"), data);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Configuration could not be saved to ${this._extensionPath}`
      );
      return;
    }
    // vscode.window.showInformationMessage(
    //   `👍 Configuration saved to ${this._extensionPath}`
    // );
  }

  private getWebviewContent(
    code: ProgramStatment,
    global_variables: ProgramStatment[],
    code_string: string
  ): string {
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "configViewer", "configViewer.js")
    );
    const reactAppUri = reactAppPathOnDisk.with({
      scheme: "vscode-resource",
    });

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
          const tsvscode = acquireVsCodeApi();
          window.code = ${JSON.stringify(code)};
          window.global_variables = ${JSON.stringify(global_variables)};
          window.code_string = ${JSON.stringify(code_string)};
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
    range: vscode.Range[],
    decoration: vscode.TextEditorDecorationType
  ) {
    editor.setDecorations(decoration, range);
  }
}
