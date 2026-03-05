const vscode = require('vscode');

function activate(context) {

    /* ---------------- KEYWORDS & MAPPINGS ---------------- */

    const keywords = [
        "aite", "lekapothe", "kakapothe", "enthavaraku", "ippudu",
        "anna_idhi", "final_ga", "mari", "leda", "aapeyyali"
    ];

    const builtinFunctions = [
        "paadu_gajaala", "idhigo", "enthundi", "ikkadidhaaka", "yentidhi"
    ];

    const listMethods = [
        "pettaraa", "petteyyi", "akkadaPettu", "teseyyi",
        "yellipo", "yekkada", "lekkettu", "saduruko",
        "tippeyyi", "tashkarinchu"
    ];

    // Mapping for Hover Documentation
    const pythonMapping = {
        "aite": "if",
        "lekapothe": "elif",
        "kakapothe": "else",
        "enthavaraku": "while",
        "ippudu": "now / current context",
        "anna_idhi": "def (function declaration)",
        "final_ga": "return",
        "paadu_gajaala": "print",
        "idhigo": "input",
        "enthundi": "len",
        "ikkadidhaaka": "range",
        "yentidhi": "type"
    };

    /* ---------------- TOKENS ---------------- */

    const tokenTypes = [
        'tfiVariableUsed',
        'tfiVariableUnused',
        'tfiFunction',
        'tfiKeyword',
        'tfiControl'
    ];
    const legend = new vscode.SemanticTokensLegend(tokenTypes);
    const diagnostics = vscode.languages.createDiagnosticCollection("tfi");
    const cache = new Map();

    /* ---------------- THEME OVERRIDE ---------------- */

    function applyTfiTheme(isActive) {
        const config = vscode.workspace.getConfiguration();
        if (isActive) {
            config.update('workbench.colorCustomizations', {
                "editor.background": "#0F0F0F",
                "sideBar.background": "#0A0A0A",
                "activityBar.background": "#050505",
                "editor.foreground": "#D4D4D4",
                "terminal.background": "#0F0F0F"
            }, vscode.ConfigurationTarget.Global);
        } else {
            config.update('workbench.colorCustomizations', {}, vscode.ConfigurationTarget.Global);
        }
    }

    /* ---------------- PARSER ---------------- */

    function parseDocument(document) {
        const key = document.uri.toString();
        const version = document.version;
        const cached = cache.get(key);
        if (cached && cached.version === version) return cached.data;

        const lines = document.getText().split("\n");
        const globals = new Map();
        const scopedVars = new Map();
        const functions = new Map();
        const usage = new Map();

        let currentFunction = null;
        let indentLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const indent = line.search(/\S|$/);
            if (!trimmed || trimmed.startsWith("#")) continue;

            const fnMatch = trimmed.match(/^anna_idhi\s+([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)/);
            if (fnMatch) {
                const name = fnMatch[1];
                const params = fnMatch[2].split(",").map(p => p.trim()).filter(Boolean);
                functions.set(name, { params, line: i });
                usage.set(name, []);
                currentFunction = name;
                indentLevel = indent;
                scopedVars.set(name, new Map());
                params.forEach(p => {
                    scopedVars.get(name).set(p, { line: i });
                    usage.set(p, []);
                });
                continue;
            }

            if (currentFunction && indent <= indentLevel) currentFunction = null;

            const varMatch = trimmed.match(/^(idhi|PanWorld)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (varMatch) {
                const name = varMatch[2];
                usage.set(name, []);
                if (currentFunction) scopedVars.get(currentFunction).set(name, { line: i });
                else globals.set(name, { line: i });
            }

            const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
            if (assignMatch) {
                const name = assignMatch[1];
                if (!usage.has(name)) usage.set(name, []);
                if (currentFunction) scopedVars.get(currentFunction).set(name, { line: i });
                else globals.set(name, { line: i });
            }

            const words = trimmed.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
            if (words) {
                words.forEach(w => {
                    if (!usage.has(w)) usage.set(w, []);
                    usage.get(w).push(i);
                });
            }
        }
        const data = { globals, functions, scopedVars, usage, lines };
        cache.set(key, { version, data });
        return data;
    }

    /* ---------------- ERROR DETECTION ---------------- */

    function validateDocument(document) {
        const parsed = parseDocument(document);
        const problems = [];
        parsed.lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("anna_idhi") && !trimmed.endsWith(":")) {
                problems.push(new vscode.Diagnostic(new vscode.Range(i, 0, i, line.length), "Function declaration must end with ':'", vscode.DiagnosticSeverity.Error));
            }
            const open = (line.match(/\(/g) || []).length;
            const close = (line.match(/\)/g) || []).length;
            if (open !== close) {
                problems.push(new vscode.Diagnostic(new vscode.Range(i, 0, i, line.length), "Unmatched parentheses", vscode.DiagnosticSeverity.Error));
            }
        });
        diagnostics.set(document.uri, problems);
    }

    /* ---------------- SEMANTIC TOKENS ---------------- */

    const semanticProvider = {
        provideDocumentSemanticTokens(document) {
            const builder = new vscode.SemanticTokensBuilder(legend);
            const parsed = parseDocument(document);
            const { globals, scopedVars, functions, usage, lines } = parsed;
            const allVars = new Map();
            globals.forEach((info, name) => allVars.set(name, info));
            scopedVars.forEach(vars => vars.forEach((info, name) => allVars.set(name, info)));

            const wordRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;

            function isInsideStringOrComment(line, index) {
                const commentIndex = line.indexOf("#");
                if (commentIndex !== -1 && index > commentIndex) return true;
                let inString = false;
                let quoteChar = null;
                let inInterpolation = false;
                let isFString = false;
                for (let i = 0; i < index; i++) {
                    const char = line[i];
                    if (!inString) {
                        if ((char === 'f' || char === 'F') && (line[i + 1] === '"' || line[i + 1] === "'")) {
                            inString = true; isFString = true; quoteChar = line[i + 1]; i++;
                        } else if (char === '"' || char === "'") {
                            inString = true; isFString = false; quoteChar = char;
                        }
                    } else {
                        if (isFString) {
                            if (char === '{' && line[i - 1] !== '\\') inInterpolation = true;
                            else if (char === '}' && line[i - 1] !== '\\') inInterpolation = false;
                        }
                        if (char === quoteChar && !inInterpolation && line[i - 1] !== '\\') {
                            inString = false; isFString = false;
                        }
                    }
                }
                return inString && (!isFString || !inInterpolation);
            }

            lines.forEach((line, lineNumber) => {
                let match;
                while (match = wordRegex.exec(line)) {
                    const word = match[0], index = match.index;
                    if (isInsideStringOrComment(line, index)) continue;
                    if (functions.has(word)) builder.push(lineNumber, index, word.length, 2, 0);
                    else if (allVars.has(word)) {
                        const use = usage.get(word) || [];
                        builder.push(lineNumber, index, word.length, use.length > 1 ? 0 : 1, 0);
                    }
                }
            });
            return builder.build();
        }
    };

    /* ---------------- HOVER DOCUMENTATION ---------------- */

    const hoverProvider = vscode.languages.registerHoverProvider('tfi', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return;
            const word = document.getText(range);

            if (pythonMapping[word]) {
                const hoverText = new vscode.MarkdownString();
                hoverText.appendMarkdown(`### TFILang Keyword: \`${word}\`\n`);
                hoverText.appendMarkdown(`---\n`);
                hoverText.appendMarkdown(`**Python Equivalent:** \`${pythonMapping[word]}\``);
                return new vscode.Hover(hoverText);
            }
        }
    });

    /* ---------------- CODE FOLDING ---------------- */

    const foldingProvider = vscode.languages.registerFoldingRangeProvider('tfi', {
        provideFoldingRanges(document) {
            const ranges = [];
            const lines = document.getText().split("\n");
            let start = null;
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.endsWith(":")) start = i;
                if (start !== null && trimmed === "" && i > start + 1) {
                    ranges.push(new vscode.FoldingRange(start, i - 1));
                    start = null;
                }
            }
            return ranges;
        }
    });

    /* ---------------- AUTOCOMPLETE ---------------- */

    const completionProvider = vscode.languages.registerCompletionItemProvider('tfi', {
        provideCompletionItems(document, position) {
            const parsed = parseDocument(document);
            const items = [];
            keywords.forEach(k => items.push(new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword)));
            builtinFunctions.forEach(fn => items.push(new vscode.CompletionItem(fn, vscode.CompletionItemKind.Function)));
            listMethods.forEach(m => items.push(new vscode.CompletionItem(m, vscode.CompletionItemKind.Method)));
            parsed.globals.forEach((_, v) => items.push(new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable)));
            parsed.functions.forEach((info, fn) => {
                const item = new vscode.CompletionItem(fn, vscode.CompletionItemKind.Function);
                let snippet = `${fn}(`;
                info.params.forEach((p, i) => {
                    snippet += `\${${i + 1}:${p}}`;
                    if (i < info.params.length - 1) snippet += ", ";
                });
                snippet += ")";
                item.insertText = new vscode.SnippetString(snippet);
                items.push(item);
            });
            return items;
        }
    });

    /* ---------------- REFERENCES ---------------- */

    const referenceProvider = vscode.languages.registerReferenceProvider('tfi', {
        provideReferences(document, position) {
            const parsed = parseDocument(document);
            const range = document.getWordRangeAtPosition(position);
            if (!range) return [];
            if (!range) return;
            const word = document.getText(range);
            const refs = [];
            parsed.usage.get(word)?.forEach(line => {
                refs.push(new vscode.Location(document.uri, new vscode.Position(line, 0)));
            });
            return refs;
        }
    });

    /* ---------------- FORMATTER (Shift + Alt + F) ---------------- */

    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('tfi', {
        provideDocumentFormattingEdits(document) {

            const lines = document.getText().split("\n");
            let indentLevel = 0;

            const tabSize = vscode.workspace.getConfiguration('editor').get('tabSize') || 4;
            const indentChar = " ".repeat(tabSize);

            const formatted = lines.map(line => {

                let trimmed = line.trim();

                if (!trimmed) return "";

                // keywords that reduce indentation
                const dedentKeywords = /^(lekapothe|kakapothe)\b/;

                if (dedentKeywords.test(trimmed)) {
                    indentLevel = Math.max(indentLevel - 1, 0);
                }

                const result = indentChar.repeat(indentLevel) + trimmed;

                // block starting keywords
                const blockStart = /:\s*$/;

                if (blockStart.test(trimmed)) {
                    indentLevel++;
                }

                return result;

            });

            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );

            return [
                vscode.TextEdit.replace(fullRange, formatted.join("\n"))
            ];
        }
    });
    
    /* ---------------- RUN ---------------- */

    const runCommand = vscode.commands.registerCommand('tfilang.execute', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const terminal = vscode.window.terminals.find(t => t.name === "TFILang") || vscode.window.createTerminal("TFILang");
        terminal.show();
        terminal.sendText(`tfi "${editor.document.fileName}"`);
    });

    /* ---------------- EVENTS ---------------- */

    if (vscode.window.activeTextEditor) {
        validateDocument(vscode.window.activeTextEditor.document);
        applyTfiTheme(vscode.window.activeTextEditor.document.languageId === 'tfi');
    }

    context.subscriptions.push(
        diagnostics,
        vscode.workspace.onDidChangeTextDocument(e => validateDocument(e.document)),
        vscode.workspace.onDidOpenTextDocument(validateDocument),
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor) return;
            validateDocument(editor.document);
            applyTfiTheme(editor.document.languageId === 'tfi');
        }),
        vscode.languages.registerDocumentSemanticTokensProvider({ language: 'tfi' }, semanticProvider, legend),
        hoverProvider,
        completionProvider,
        referenceProvider,
        foldingProvider,
        formattingProvider,
        runCommand
    );
}

function deactivate() {
    vscode.workspace.getConfiguration().update('workbench.colorCustomizations', {}, vscode.ConfigurationTarget.Global);
}

module.exports = { activate, deactivate };