# BC Field Inspector

A browser extension that shows **field control names** directly on Microsoft Dynamics 365 Business Central pages — no need to open Page Inspection.

![Chrome](https://img.shields.io/badge/Chrome-supported-green) ![Edge](https://img.shields.io/badge/Edge-supported-green) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## The Problem

When consultants and developers collaborate on BC customizations, consultants see field **captions** (e.g., "Signatory 1 Code") but developers need the actual **control names** from the AL page definition (e.g., `Signatory 1 Code-AdDoc`). The built-in Page Inspection (Ctrl+Alt+F1) requires clicking each field individually and scrolling through a list — slow and tedious.

## The Solution

BC Field Inspector shows the AL control name as a small green badge next to every field label on the page. One click on a badge copies the name to clipboard, ready to paste into a chat with the developer.

## Features

- **Automatic BC detection** — works on both SaaS (`businesscentral.dynamics.com`) and on-premises installations, no configuration needed
- **Green badges on fields** — shows the `controlname` attribute from the BC DOM next to each field caption
- **Blue badges on parts** — distinguishes page parts (FactBoxes, subpages) from regular fields
- **Click to copy** — single click on any badge copies the control name to clipboard
- **Lazy-load aware** — automatically adds badges when collapsed FastTabs are expanded
- **Non-intrusive** — badges are absolutely positioned and don't affect page layout; truncated with "..." in narrow areas, expand on hover
- **SPA navigation** — detects page changes within the BC single-page app and re-scans
- **Toggle on/off** — enable or disable via the extension popup
- **No server component** — pure browser extension, nothing to install in BC

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/sta-ko-je-reko-ja-sam-reko/BCFieldInspector.git
   ```
2. Open **Edge** (`edge://extensions/`) or **Chrome** (`chrome://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` folder
5. Navigate to any Business Central page
6. Click the **BC Field Inspector** icon in the toolbar and toggle **Show field names** ON

## How It Works

The BC web client renders each page control as an HTML element with a `controlname` attribute that matches the control name from the AL page definition. The extension:

1. Detects BC pages by checking the URL pattern, page title, and DOM structure
2. Scans the DOM for all elements with `controlname` attributes
3. Positions a badge in the top-right corner of each control
4. Watches for DOM changes (expanding FastTabs, navigating between pages) and re-scans automatically

## Supported Environments

- **SaaS**: `businesscentral.dynamics.com`, `*.bc.dynamics.com`
- **On-premises**: Any URL with `/BC*/` path pattern and BC query parameters (`company`, `tenant`, `page`)
- **Docker/sandbox**: `localhost` with BC instances

## Screenshots

| Feature | Description |
|---------|-------------|
| Field badges | Green badges show control names next to field captions |
| Part badges | Blue badges distinguish FactBoxes and subpages |
| Click to copy | Single click copies the control name to clipboard |
| Hover expand | Truncated badges expand on hover to show full name |

## Use Case

1. Consultant opens a BC page and enables BC Field Inspector
2. Developer asks: "What's the field name for that Signatory field?"
3. Consultant clicks the green badge next to "Signatory 1 Code" — `Signatory 1 Code-AdDoc` is copied
4. Consultant pastes it in the chat

## Requirements

- Microsoft Edge or Google Chrome
- Access to a Business Central web client (any version with the modern web client)

## License

MIT
