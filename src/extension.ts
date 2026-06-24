import * as vscode from "vscode";
import Groq from "groq-sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

let explanationPanel: vscode.WebviewPanel | undefined;

async function callAI(prompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });
  return response.choices[0].message.content || "";
}

function getWebviewContent(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 20px;
          line-height: 1.7;
          color: var(--vscode-foreground);
          background: var(--vscode-editor-background);
        }
        h2 {
          color: var(--vscode-textLink-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 8px;
          margin-top: 0;
        }
        .content {
          white-space: pre-wrap;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <div class="content">${content}</div>
    </body>
    </html>
  `;
}

function createOrRevealPanel(title: string): vscode.WebviewPanel {
  if (explanationPanel) {
    explanationPanel.title = title;
    explanationPanel.reveal(vscode.ViewColumn.Two);
    return explanationPanel;
  }

  explanationPanel = vscode.window.createWebviewPanel(
    "aiCodePanel",
    title,
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  explanationPanel.onDidDispose(() => {
    explanationPanel = undefined;
  });

  return explanationPanel;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("AI Code Explainer is active!");

  // COMMAND 1: Explain selected code
  const explainCommand = vscode.commands.registerCommand(
    "ai-code-explainer.explain",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selectedCode = editor.document.getText(editor.selection);
      if (!selectedCode.trim()) {
        vscode.window.showWarningMessage(
          "Please select some code first, then press Ctrl+Shift+E."
        );
        return;
      }

      const panel = createOrRevealPanel("AI Code Explanation");
      panel.webview.html = getWebviewContent(
        "Analyzing your code with Llama 3.3...",
        "AI Code Explanation"
      );

      try {
        const prompt = `Please explain the following code clearly and concisely.
Break it down step by step. Focus on:
1. What this code does overall
2. How it works step by step
3. Any important patterns or concepts used
4. Potential improvements or issues to watch for

Code:
\`\`\`
${selectedCode}
\`\`\``;

        vscode.window.showInformationMessage("Explaining code...");
        const explanation = await callAI(prompt);
        panel.webview.html = getWebviewContent(explanation, "AI Code Explanation");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        panel.webview.html = getWebviewContent(`Error: ${msg}`, "Error");
        vscode.window.showErrorMessage(`Failed: ${msg}`);
      }
    }
  );

  // COMMAND 2: Review selected code
  const reviewCommand = vscode.commands.registerCommand(
    "ai-code-explainer.review",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selectedCode = editor.document.getText(editor.selection);
      if (!selectedCode.trim()) {
        vscode.window.showWarningMessage(
          "Please select some code to review."
        );
        return;
      }

      const panel = createOrRevealPanel("AI Code Review");
      panel.webview.html = getWebviewContent(
        "Reviewing your code...",
        "AI Code Review"
      );

      try {
        const prompt = `Review this code and provide specific, actionable feedback on:
1. Bugs or potential errors
2. Security vulnerabilities
3. Performance improvements
4. Code quality and readability
5. Best practices

Be direct and specific. For each issue, show the problematic code
and suggest the fix.

Code:
\`\`\`
${selectedCode}
\`\`\``;

        vscode.window.showInformationMessage("Reviewing code...");
        const review = await callAI(prompt);
        panel.webview.html = getWebviewContent(review, "AI Code Review");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        panel.webview.html = getWebviewContent(`Error: ${msg}`, "Error");
      }
    }
  );

  // COMMAND 3: Generate documentation
  const docCommand = vscode.commands.registerCommand(
    "ai-code-explainer.document",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selectedCode = editor.document.getText(editor.selection);
      if (!selectedCode.trim()) {
        vscode.window.showWarningMessage(
          "Please select a function to document.");
        return;
      }

      const panel = createOrRevealPanel("AI Documentation");
      panel.webview.html = getWebviewContent(
        "Generating documentation...",
        "AI Documentation"
      );

      try {
        const prompt = `Generate a clear, professional docstring/comment block for
this code. Include:
- What the function/class does
- Parameters and their types
- Return value
- Example usage

Code:
\`\`\`
${selectedCode}
\`\`\``;

        vscode.window.showInformationMessage("Generating documentation...");
        const doc = await callAI(prompt);
        panel.webview.html = getWebviewContent(doc, "AI Documentation");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        panel.webview.html = getWebviewContent(`Error: ${msg}`, "Error");
      }
    }
  );

  context.subscriptions.push(explainCommand, reviewCommand, docCommand);
}

export function deactivate() {}