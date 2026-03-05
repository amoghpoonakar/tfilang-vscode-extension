# TFILang — Official VS Code Extension

**TFILang** is a Python-inspired programming language with expressive Telugu-style keywords and a fun syntax.

This extension provides full **Visual Studio Code support** for writing and running TFILang programs.

---

# Features

## Syntax Highlighting

Clean and readable syntax highlighting designed specifically for TFILang.

Supports highlighting for:

* Keywords
* Built-in functions
* Methods
* Variables
* Numbers
* Strings
* Escape characters
* Comments
* f-strings with `{}` interpolation

---

## IntelliSense (Auto Suggestions)

The extension provides smart suggestions while coding.

Suggestions include:

* TFILang keywords
* Built-in functions
* Variables declared in the file
* Suggestions inside **f-string `{}` interpolation**

Example:

```tfi
idhi name = "Amogh"

paadu_gajaala(name)
```

---

## Parameter Hints

Function hints appear automatically when typing function calls.

Example:

```
paadu_gajaala(message)
idhigo(prompt)
ikkadidhaaka(start, end)
```

---

## Hover Documentation

Hover over TFILang keywords to see their **Python equivalent**.

Example mappings:

| TFILang         | Python Equivalent |
| --------------- | ----------------- |
| `aite`          | `if`              |
| `lekapothe`     | `elif`            |
| `kakapothe`     | `else`            |
| `paadu_gajaala` | `print`           |
| `idhigo`        | `input`           |
| `enthundi`      | `len`             |
| `yentidhi`      | `type`            |

---

## Run Button

A **Run TFILang** button appears in the editor toolbar.

Clicking the button runs:

```
tfi your_file.tfi
```

inside the VS Code terminal.

---

# Example TFILang Programs

### Example 1

```tfi
idhi name = "Amogh"

paadu_gajaala("Hello")
paadu_gajaala(name)
```

---

### Example 2

```tfi
idhi name = "Amogh"

aite name == "Amogh":
    paadu_gajaala("Creator detected")
kakapothe:
    paadu_gajaala("Unknown user")
```

---

### Example 3 (f-string)

```tfi
idhi name = "Amogh"

paadu_gajaala(f"Hello {name}")
```

---

# File Extension

TFILang programs use the extension:

```
.tfi
```

Example:

```
hello.tfi
```

---

# Installation

### Install from VSIX

1. Download the `.vsix` extension file
2. Open **Visual Studio Code**
3. Go to **Extensions**
4. Click **⋯ → Install from VSIX**
5. Select the TFILang `.vsix` file

---

# Requirements

To run TFILang programs you must have the **TFILang interpreter** installed.

The extension runs files using:

```
tfi <filename>
```

---

# Release Notes

### Version 1.0.0

Initial release including:

* TFILang syntax highlighting
* IntelliSense suggestions
* Parameter hints
* Hover documentation
* f-string support
* Run button in editor
* Custom TFILang color theme

---

# Contact the Developer

Created by **Amogh V P**

Instagram
https://www.instagram.com/amogh.poonakar/
